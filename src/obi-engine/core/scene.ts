import { mat3, mat4, quat, vec3, vec4 } from "gl-matrix"
import { Camera } from "./camera"
import { Light, LightType } from "./light"
import Mesh from "./mesh"
import Model from "./model"
import OBI from "./obi"
import { Lighting } from "./pipeline-library"

export default class Scene{

    mainCamera: Camera
    pipelines: Map<GPURenderPipeline, Map<Mesh, Model[]>>
    ambientLight: vec4
    dirLight: Light
    pointlights: Light[]
    dirAmbientBuffer: GPUBuffer
    pointLightBuffers: Map<Model, GPUBuffer>
    lightGroups: Map<Model, GPUBindGroup>
    matrixGroups: Map<Model, GPUBindGroup>
    
    constructor(){
        this.mainCamera = new Camera()
        this.pipelines = new Map<GPURenderPipeline, Map<Mesh, Model[]>>()

        this.matrixGroups = new Map<Model, GPUBindGroup>()

        this.pointlights = []
        this.pointLightBuffers = new Map<Model, GPUBuffer>()
        this.lightGroups = new Map<Model, GPUBindGroup>()

        this.dirLight = new Light(LightType.Directional, vec3.fromValues(0,5,0), quat.fromEuler(quat.create(), 0.5,0,0))
        this.dirLight.color = vec3.fromValues(1,1,1)
        this.ambientLight = vec4.fromValues(1,1,1,0.1)

        this.dirAmbientBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer for lighting data',
            size: 3 * 4 * 4, // 3 * vec4<float32>
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })


    }

    addLight(light:Light){
        if(light.type === LightType.Directional)
            this. dirLight = light
        
        if(light.type === LightType.Point)
            this.pointlights.push(light)

        if(light.type === LightType.Spot)
            throw new Error("not supported yet")
    }

    addModel(model:Model){
        if(!this.pipelines.has(model.renderer.pipeline)){
            this.pipelines.set(model.renderer.pipeline, new Map<Mesh,Model[]>())
        } 
        var meshMap = this.pipelines.get(model.renderer.pipeline)

        if(!meshMap.has(model.mesh)){
            meshMap.set(model.mesh, [])
        }
        meshMap.get(model.mesh).push(model)

        if(model.material.lighting === Lighting.BlinnPhong)
            this.createLightBindGroup(model)
        this.createMatrixBindGroud(model)
        return model
    }

    draw(){

        this.updateAmbientDirLights()

        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [
                {
                    view: OBI.context.getCurrentTexture().createView(),
                    clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
                    loadOp: 'clear',
                    storeOp: 'store'
                }
            ],
            depthStencilAttachment: {
                view: this.mainCamera.depthMap.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            }
        }

        const commandEncoder = OBI.device.createCommandEncoder()
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
        this.pipelines.forEach((meshes, pipeline) => {

            passEncoder.setPipeline(pipeline)

            OBI.device.queue.writeBuffer(this.mainCamera.viewBuffer, 0, this.mainCamera.viewMatrix as Float32Array)
            OBI.device.queue.writeBuffer(this.mainCamera.projBuffer, 0, this.mainCamera.projectionMatrix as Float32Array)

            meshes.forEach((models, mesh) => {

                // set vertex
                passEncoder.setVertexBuffer(0, mesh.vertexBuffer)
                passEncoder.setIndexBuffer(mesh.indexBuffer, "uint16")
                
                models.forEach(model => {

                    model.update()
                    OBI.device.queue.writeBuffer(model.renderer.modelMatrixBuffer, 0, model.transform.modelMatrix as Float32Array)

                    let invTrans3x3: mat3 = mat3.create();
                    mat3.normalFromMat4(invTrans3x3, model.transform.modelMatrix);
                    
                    OBI.device.queue.writeBuffer(model.renderer.invTransBuffer, 0, invTrans3x3 as Float32Array)

                    // set uniformGroup for vertex shader
                    passEncoder.setBindGroup(0, this.matrixGroups.get(model))
                    // set textureGroup
                    passEncoder.setBindGroup(1, model.renderer.materialBindGroup)
                    // set lightGroup
                    if(model.material.lighting == Lighting.BlinnPhong){
                        this.updatePointLightBuffer(model)
                        passEncoder.setBindGroup(2, this.lightGroups.get(model))
                    }

                    // draw vertex count of cube
                    passEncoder.drawIndexed(model.mesh.vertexCount)
                    // webgpu run in a separate process, all the commands will be executed after submit
                });
            });
        })
        passEncoder.end()
        OBI.device.queue.submit([commandEncoder.finish()])
    }

    updateAmbientDirLights(){
        this.dirLight.transform.update()
        let ambientDirData = new Float32Array(3 * 4)
        ambientDirData.set(this.ambientLight, 0)
        ambientDirData.set(this.dirLight.transform.localForward, 4)
        ambientDirData.set(this.dirLight.color, 8)
        OBI.device.queue.writeBuffer(this.dirAmbientBuffer, 0, ambientDirData)
    }

    createLightBindGroup(model:Model){
        if(model.material.lighting === Lighting.Unlit)
            return
        const pointLightBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer for lighting data',
            size: 3 * 4 * 4 * 3, // 3 * vec4<float32> * 3 point lights
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        this.pointLightBuffers.set(model, pointLightBuffer)

        const bindGroup = OBI.device.createBindGroup({
            label: 'Light Group with Ambient, Dir and PointLights',
            layout: model.renderer.pipeline.getBindGroupLayout(2),
            entries: [
                {
                    binding: 0, // the color buffer
                    resource: {
                        buffer: this.dirAmbientBuffer
                    }
                },
                {
                    binding: 1, // the sampler
                    resource: {
                        buffer: pointLightBuffer
                    }
                }
            ]
        })

        this.lightGroups.set(model, bindGroup)
    }

    updatePointLightBuffer(model:Model){
        if(model.material.lighting === Lighting.Unlit)
            return
        if(this.pointlights.length >= 3){ // if less than 4 point lights, no sorting required
            const pointLightSortingFunction = (lightA: Light, lightB: Light) => {
                const distA = vec3.sqrDist(model.transform.position, lightA.transform.position)
                const distB = vec3.sqrDist(model.transform.position, lightB.transform.position)
                if (distA < distB) {
                    return -1;
                }
                if (distA > distB) {
                    return 1;
                }
                return 0;
            }
            this.pointlights.sort(pointLightSortingFunction)
        }

        const lightData = new Float32Array(3 * 3 * 4) // 3 point lights with 3 vec4
        lightData.fill(0)
        for(let i = 0; i<this.pointlights.length && i<3; i++){
            lightData.set(this.pointlights[i].transform.position, i * 12)
            lightData.set(this.pointlights[i].color, i * 12 + 4)
            lightData[i * 12 + 8] = this.pointlights[i].range
            lightData[i * 12 + 9] = this.pointlights[i].intensity
        }

        const buffer = this.pointLightBuffers.get(model)
        OBI.device.queue.writeBuffer(buffer, 0, lightData)
    }

    createMatrixBindGroud(model:Model){
        const bindGroup = OBI.device.createBindGroup({
            label: 'Light Group with Ambient, Dir and PointLights',
            layout: model.renderer.pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0, // model matrix
                    resource: {
                        buffer: model.renderer.modelMatrixBuffer
                    }
                },
                {
                    binding: 1, // view matrix
                    resource: {
                        buffer: this.mainCamera.viewBuffer
                    }
                },
                {
                    binding: 2, // proj matrix
                    resource: {
                        buffer: this.mainCamera.projBuffer
                    }
                },
                {
                    binding: 3, // the sampler
                    resource: {
                        buffer: model.renderer.invTransBuffer
                    }
                }
            ]
        })

        this.matrixGroups.set(model, bindGroup)
    }
}