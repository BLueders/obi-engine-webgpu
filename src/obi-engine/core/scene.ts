import { mat3, mat4, quat, vec3, vec4 } from "gl-matrix"
import { toMat4 } from "../utils/utils"
import { Camera } from "./camera"
import Environment from "./environment"
import { Light, LightType } from "./light"
import { Material } from "./material"
import Mesh from "./mesh"
import Model from "./model"
import OBI from "./obi"
import { Lighting, ShaderLibrary } from "./shader-library"
import Shader from "./shader"
import { SceneGraph } from "./transform"
import ShadowPassShader from "./shadowpass-shader"
import StandardShader from "./standard-shader"
import StandardMaterial from "./standard-material"

export default class Scene {

    sceneGraph: SceneGraph

    environment: Environment
    mainCamera: Camera
    ambientLight: vec4
    dirLight: Light
    pointlights: Light[]

    dirAmbientBuffer: GPUBuffer
    materials: Map<Material, Map<Mesh, Model[]>>
    shadowShader: ShadowPassShader

    constructor(environment: Environment) {
        this.sceneGraph = new SceneGraph()

        this.mainCamera = new Camera()
        this.materials = new Map<Material, Map<Mesh, Model[]>>()
        this.shadowShader = ShaderLibrary.getShadowShader()

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

    prepare() {
        this.materials.forEach((mesh, material) => {
            material.validate()
            material.bindScene(this)
        })
    }

    draw() {

        this.updateAmbientDirLights()

        this.sceneGraph.updateGraph()
        this.dirLight.shadowProjector.update(this)

        // OBI.device.queue.writeBuffer(this.mainCamera.cameraBuffer, 0, this.mainCamera.viewMatrix as Float32Array)
        // OBI.device.queue.writeBuffer(this.mainCamera.cameraBuffer, 64, this.mainCamera.projectionMatrix as Float32Array)
        // OBI.device.queue.writeBuffer(this.mainCamera.cameraBuffer, 128, this.mainCamera.getPosition() as Float32Array)

        // OBI.device.queue.writeBuffer(this.dirLight.shadowProjector.lightCameraBuffer, 0, this.dirLight.shadowProjector.viewMatrix as Float32Array)
        // OBI.device.queue.writeBuffer(this.dirLight.shadowProjector.lightCameraBuffer, 64, this.dirLight.shadowProjector.projectionMatrix as Float32Array)
        // OBI.device.queue.writeBuffer(this.dirLight.shadowProjector.lightCameraBuffer, 128, this.mainCamera.getPosition() as Float32Array)

        //OBI.device.queue.writeBuffer(this.dirLight.shadowProjector.lightMatrixBuffer, 0, this.dirLight.shadowProjector.lightMatrix as Float32Array)

        //update model bufferdata
        // this.materials.forEach((meshes, material) => {
        //     meshes.forEach((models, mesh) => {
        //         models.forEach(model => {
        //             OBI.device.queue.writeBuffer(model.renderer.modelBuffer, 0, model.transform.modelMatrix as Float32Array)
        //             OBI.device.queue.writeBuffer(model.renderer.modelBuffer, 64, model.transform.normalMatrix as Float32Array)
        //         })
        //     })
        // })

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
        shadowPassEndcoder.setPipeline(this.shadowShader.renderPipeline)

        OBI.device.queue.writeBuffer(this.shadowShader.lightCameraBuffer, 0, this.dirLight.shadowProjector.viewMatrix as Float32Array)
        OBI.device.queue.writeBuffer(this.shadowShader.lightCameraBuffer, 64, this.dirLight.shadowProjector.projectionMatrix as Float32Array)
        OBI.device.queue.writeBuffer(this.shadowShader.lightCameraBuffer, 128, this.mainCamera.getPosition() as Float32Array)

        this.materials.forEach((meshes, material) => {
            meshes.forEach((models, mesh) => {
                // set vertex
                shadowPassEndcoder.setVertexBuffer(0, mesh.vertexBuffer)
                shadowPassEndcoder.setIndexBuffer(mesh.indexBuffer, "uint16")
                models.forEach(model => {
                    if(!model.material.castShadows)
                        return
                    
                    OBI.device.queue.writeBuffer(this.shadowShader.modelBuffer, 0, model.transform.modelMatrix as Float32Array)
                    shadowPassEndcoder.setBindGroup(0, this.shadowShader.matrixBindGroup)
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

        this.materials.forEach((meshes, material) => {

            renderPassEncoder.setPipeline(material.shader.renderPipeline)

            OBI.device.queue.writeBuffer((material.shader as StandardShader).lightMatrixBuffer, 0, this.dirLight.shadowProjector.lightMatrix as Float32Array)

            OBI.device.queue.writeBuffer(material.shader.sceneBuffer, 0, this.mainCamera.viewMatrix as Float32Array)
            OBI.device.queue.writeBuffer(material.shader.sceneBuffer, 64, this.mainCamera.projectionMatrix as Float32Array)
            OBI.device.queue.writeBuffer(material.shader.sceneBuffer, 128, this.mainCamera.getPosition() as Float32Array)

            meshes.forEach((models, mesh) => {

                // set vertex
                renderPassEncoder.setVertexBuffer(0, mesh.vertexBuffer)
                renderPassEncoder.setIndexBuffer(mesh.indexBuffer, "uint16")

                models.forEach(model => {

                    OBI.device.queue.writeBuffer(material.shader.modelBuffer, 0, model.transform.modelMatrix as Float32Array)
                    OBI.device.queue.writeBuffer(material.shader.modelBuffer, 64, model.transform.normalMatrix as Float32Array)

                    // set uniformGroup for vertex shader
                    renderPassEncoder.setBindGroup(0, material.shader.matrixBindGroup)
                    // set textureGroup
                    renderPassEncoder.setBindGroup(1, (material.shader as StandardShader).materialBindGroup)
                    // set lightGroup
                    if (material.lighting == Lighting.BlinnPhong) {
                        (material as StandardMaterial).updatePointLightBuffer(this.pointlights, model.transform.position)
                        renderPassEncoder.setBindGroup(2, (material.shader as StandardShader).lightingBindGroup)
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
        if (!this.materials.has(model.material)) {
            this.materials.set(model.material, new Map<Mesh, Model[]>())
        }
        var meshMap = this.materials.get(model.material)

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

