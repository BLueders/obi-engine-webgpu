import { mat3, mat4, quat, vec3, vec4 } from "gl-matrix"
import { Camera } from "./camera"
import Environment from "./environment"
import { Light, LightType } from "./light"
import Mesh from "./mesh"
import Model from "./model"
import OBI from "./obi"
import { Lighting, PipelineLibrary } from "./pipeline-library"
import { SceneGraph } from "./transform"

export default class Scene {

    sceneGraph: SceneGraph

    environment: Environment
    mainCamera: Camera
    ambientLight: vec4
    dirLight: Light
    pointlights: Light[]

    dirAmbientBuffer: GPUBuffer
    pipelines: Map<GPURenderPipeline, Map<Mesh, Model[]>>
    shadowPipeline: GPURenderPipeline

    constructor(environment: Environment) {
        this.sceneGraph = new SceneGraph()

        this.mainCamera = new Camera()
        this.pipelines = new Map<GPURenderPipeline, Map<Mesh, Model[]>>()
        this.shadowPipeline = PipelineLibrary.createShadowPipeline()

        this.pointlights = []

        this.addLight(new Light(LightType.Directional, vec3.fromValues(0, 5, 0), quat.fromEuler(quat.create(), 0.5, 0, 0)))
        this.dirLight.color = vec3.fromValues(1, 1, 1)
        this.ambientLight = vec4.fromValues(1, 1, 1, 0.1)

        this.dirAmbientBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer for lighting data',
            size: 3 * 4 * 4, // 3 * vec4<float32>
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        this.environment = environment
    }

    draw() {

        this.updateAmbientDirLights()

        this.sceneGraph.updateGraph()
        this.dirLight.shadowProjector.update(this)

        OBI.device.queue.writeBuffer(this.mainCamera.viewBuffer, 0, this.mainCamera.viewMatrix as Float32Array)
        OBI.device.queue.writeBuffer(this.mainCamera.projBuffer, 0, this.mainCamera.projectionMatrix as Float32Array)
        OBI.device.queue.writeBuffer(this.mainCamera.camPosBuffer, 0, this.mainCamera.getPosition() as Float32Array)

        OBI.device.queue.writeBuffer(this.dirLight.shadowProjector.viewBuffer, 0, this.dirLight.shadowProjector.viewMatrix as Float32Array)
        OBI.device.queue.writeBuffer(this.dirLight.shadowProjector.projBuffer, 0, this.dirLight.shadowProjector.projectionMatrix as Float32Array)
        // OBI.device.queue.writeBuffer(this.dirLight.shadowProjector.viewBuffer, 0, this.mainCamera.viewMatrix as Float32Array)
        // OBI.device.queue.writeBuffer(this.dirLight.shadowProjector.projBuffer, 0, this.mainCamera.projectionMatrix as Float32Array)
        OBI.device.queue.writeBuffer(this.dirLight.shadowProjector.lightMatrixBuffer, 0, this.dirLight.shadowProjector.lightMatrix as Float32Array)

        //update model bufferdata
        this.pipelines.forEach((meshes, pipeline) => {
            meshes.forEach((models, mesh) => {
                models.forEach(model => {
                    OBI.device.queue.writeBuffer(model.renderer.modelMatrixBuffer, 0, model.transform.modelMatrix as Float32Array)
                    OBI.device.queue.writeBuffer(model.renderer.invTransBuffer, 0, model.transform.invTransMatrix as Float32Array)
                })
            })
        })

        const commandEncoder = OBI.device.createCommandEncoder()

        // SHADOW PASS
        const shadowPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [],
            depthStencilAttachment: {
                view: this.dirLight.shadowProjector.shadowMapView,
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            }
        }

        const shadowPassEndcoder = commandEncoder.beginRenderPass(shadowPassDescriptor)
        shadowPassEndcoder.setPipeline(this.shadowPipeline)
        this.pipelines.forEach((meshes, pipeline) => {
            meshes.forEach((models, mesh) => {
                // set vertex
                shadowPassEndcoder.setVertexBuffer(0, mesh.vertexBuffer)
                shadowPassEndcoder.setIndexBuffer(mesh.indexBuffer, "uint16")
                models.forEach(model => {
                    if(!model.renderer.castsShadows)
                        return
                    shadowPassEndcoder.setBindGroup(0, model.renderer.shadowpassMatrixBindGroup)
                    shadowPassEndcoder.drawIndexed(model.mesh.vertexCount)
                })
            })
        })
        shadowPassEndcoder.end()

        // RENDER PASS
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

        const renderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)

        this.environment.drawSkybox(renderPassEncoder, this.mainCamera)

        this.pipelines.forEach((meshes, pipeline) => {

            renderPassEncoder.setPipeline(pipeline)

            meshes.forEach((models, mesh) => {

                // set vertex
                renderPassEncoder.setVertexBuffer(0, mesh.vertexBuffer)
                renderPassEncoder.setIndexBuffer(mesh.indexBuffer, "uint16")

                models.forEach(model => {

                    // set uniformGroup for vertex shader
                    renderPassEncoder.setBindGroup(0, model.renderer.matrixBindGroup)
                    // set textureGroup
                    renderPassEncoder.setBindGroup(1, model.renderer.materialBindGroup)
                    // set lightGroup
                    if (model.renderer.lighting == Lighting.BlinnPhong) {
                        model.renderer.updatePointLightBuffer(this.pointlights)
                        renderPassEncoder.setBindGroup(2, model.renderer.lightingBindGroup)
                    }

                    // draw vertex count of cube
                    renderPassEncoder.drawIndexed(model.mesh.vertexCount)
                    // webgpu run in a separate process, all the commands will be executed after submit
                });
            });
        })
        renderPassEncoder.end()
        OBI.device.queue.submit([commandEncoder.finish()])
    }

    addLight(light: Light) {
        if (light.type === LightType.Directional)
            this.dirLight = light

        if (light.type === LightType.Point)
            this.pointlights.push(light)

        if (light.type === LightType.Spot)
            throw new Error("not supported yet")

        // if no parent set yet, make root in scene
        if (!light.transform.getParent())
            this.sceneGraph.addChild(light.transform)
    }

    addModel(model: Model) {
        model.renderer.configureForScene(this)

        if (!this.pipelines.has(model.renderer.pipeline)) {
            this.pipelines.set(model.renderer.pipeline, new Map<Mesh, Model[]>())
        }
        var meshMap = this.pipelines.get(model.renderer.pipeline)

        if (!meshMap.has(model.mesh)) {
            meshMap.set(model.mesh, [])
        }
        meshMap.get(model.mesh).push(model)

        // if no parent set yet, make root in scene
        if (!model.transform.getParent())
            this.sceneGraph.addChild(model.transform)

        return model
    }

    updateAmbientDirLights() {
        // ambient color is 0-4 (vec4)
        // dir light direction is 4-8 (vec4)
        // dir light color is 8-12 (vec4)
        let ambientDirData = new Float32Array(3 * 4)
        ambientDirData.set(this.ambientLight, 0)
        ambientDirData.set(this.dirLight.transform.localForward, 4)
        ambientDirData.set(this.dirLight.color, 8)
        OBI.device.queue.writeBuffer(this.dirAmbientBuffer, 0, ambientDirData)
    }
}

