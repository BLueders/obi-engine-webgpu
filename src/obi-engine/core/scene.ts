import { mat3, mat4, quat, vec3, vec4 } from "gl-matrix"
import { Camera } from "./camera"
import { Light, LightType } from "./light"
import Model from "./model"
import OBI from "./obi"
import Pipeline from "./pipeline"

export default class Scene{

    mainCamera: Camera
    pipelines: Map<Pipeline, Model[]>

    ambientLight: vec4
    dirLight: Light
    pointlights: Light[]
    dirAmbientBuffer: GPUBuffer
    pointLightBuffer: GPUBuffer
    lightGroups: Map<Pipeline, GPUBindGroup>
    
    constructor(){
        this.mainCamera = new Camera()
        this.pipelines = new Map<Pipeline, Model[]>()
        this.pointlights = []

        this.dirLight = new Light(LightType.Directional, vec3.fromValues(0,5,0), quat.fromEuler(quat.create(), 0.5,0,0))
        this.dirLight.color = vec3.fromValues(1,1,1)
        this.ambientLight = vec4.fromValues(1,1,1,0.1)

        this.pointlights.push(new Light(LightType.Point))
        this.pointlights.push(new Light(LightType.Point))
        this.pointlights.push(new Light(LightType.Point))

        this.lightGroups = new Map<Pipeline, GPUBindGroup>()

        this.dirAmbientBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer for lighting data',
            size: 3 * 4 * 4, // 3 * vec4<float32>
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })

        this.pointLightBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer for lighting data',
            size: 3 * 4 * 4 * 4, // 3 * vec4<float32> * 4 point lights
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
        if(!this.pipelines.has(model.material.pipeline)){
            this.pipelines.set(model.material.pipeline, [model])
        } else {
            this.pipelines.get(model.material.pipeline).push(model)
        }
        this.createLightBindGroup(model.material.pipeline)
    }

    draw(){

        this.updateAmbientDirLights()

        const commandEncoder = OBI.device.createCommandEncoder()
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

        this.pipelines.forEach((models, pipeline) => {

            const pl = pipeline.gpuPipeline

            const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
            passEncoder.setPipeline(pl)

            models.forEach(model => {

                model.update()
                // set vertex
                passEncoder.setVertexBuffer(0, model.mesh.vertexBuffer)
                passEncoder.setIndexBuffer(model.mesh.indexBuffer, "uint16")

                // update matrices and vertex uniform buffers
                const mvpData = new Float32Array(16 * 3);
                mvpData.set(model.transform.modelMatrix, 0);
                mvpData.set(this.mainCamera.viewMatrix, 16);
                mvpData.set(this.mainCamera.projectionMatrix, 32);
                
                OBI.device.queue.writeBuffer(pipeline.mvpBuffer, 0, mvpData)

                let invTrans3x3: mat3 = mat3.create();
                mat3.normalFromMat4(invTrans3x3, model.transform.modelMatrix);
                OBI.device.queue.writeBuffer(pipeline.invTransBuffer, 0, invTrans3x3 as Float32Array)
                OBI.device.queue.writeBuffer(pipeline.camPosBuffer, 0, this.mainCamera.getPosition() as Float32Array)

                // set uniformGroup for vertex shader
                passEncoder.setBindGroup(0, pipeline.vertexUniformGroup)
                // set textureGroup
                passEncoder.setBindGroup(1, model.material.materialBindGroup)
                // set lightGroup
                passEncoder.setBindGroup(2, this.lightGroups.get(pipeline))
                // draw vertex count of cube
                passEncoder.drawIndexed(model.mesh.vertexCount)
                // webgpu run in a separate process, all the commands will be executed after submit
            });

            passEncoder.end()
        })

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

    createLightBindGroup(pipeline:Pipeline){
        if(this.lightGroups.has(pipeline)) return

        const bindGroup = OBI.device.createBindGroup({
            label: 'Light Group with Ambient, Dir and PointLights',
            layout: pipeline.gpuPipeline.getBindGroupLayout(2),
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
                        buffer: this.pointLightBuffer
                    }
                }
            ]
        })

        this.lightGroups.set(pipeline, bindGroup)
    }
}