import { mat3, mat4, quat, vec3, vec4 } from "gl-matrix"
import { toMat4 } from "../utils/utils"
import { Camera } from "./camera"
import Environment from "./environment"
import { Light, LightType } from "./light"
import { Material, MaterialStatus } from "./material"
import Mesh from "./mesh"
import Model from "./model"
import OBI from "./obi"
import { Lighting, ShaderLibrary } from "./shader-library"
import Shader from "./shader"
import { SceneGraph } from "./transform"
import StandardMaterial from "./standard-material"
import { RenderPassType } from "./renderer/renderpass"

export default class Scene {

    sceneGraph: SceneGraph

    environment: Environment
    mainCamera: Camera
    ambientLight: vec4
    lights: Light[]

    materials: Map<Material, Map<Mesh, Model[]>>
    shadowShader: Shader

    sceneRessources: SceneRessources

    constructor(environment: Environment) {
        this.sceneGraph = new SceneGraph()

        this.mainCamera = new Camera()
        this.materials = new Map<Material, Map<Mesh, Model[]>>()
        this.shadowShader = ShaderLibrary.getShadowShader()

        this.sceneRessources = new SceneRessources()

        this.lights = []

        const dirLight = new Light(LightType.Directional, vec3.fromValues(0, 5, 0), quat.fromEuler(quat.create(), 45, 0, 0))
        dirLight.color = vec3.fromValues(1, 1, 1)
        this.addLight(dirLight)
        this.ambientLight = vec4.fromValues(1, 1, 1, 0.1)

        this.environment = environment
    }

    prepare() {
        this.materials.forEach((meshes, material) => {
            material.bindScene(this)
            material.validate()
            meshes.forEach((models, mesh) => {
                models.forEach(model => model.prepareBindGroups())
            })
        })
    }

    draw(camera?: Camera) {

        if (!camera)
            camera = this.mainCamera

        this.sceneRessources.updateSceneRessources(camera, this.ambientLight, this.lights)

        this.sceneGraph.updateGraph()

        // update model bufferdata
        const viewProjectionMatrix = mat4.clone(camera.projectionMatrix)
        mat4.mul(viewProjectionMatrix, viewProjectionMatrix, camera.viewMatrix)
        this.materials.forEach((meshes, material) => {
            meshes.forEach((models, mesh) => {
                models.forEach(model => {
                    OBI.device.queue.writeBuffer(model.modelUniformBuffer, 0, model.transform.modelMatrix as Float32Array)
                    OBI.device.queue.writeBuffer(model.modelUniformBuffer, 64, model.transform.normalMatrix as Float32Array)
                    const mvpMatrix = mat4.clone(viewProjectionMatrix)
                    mat4.mul(mvpMatrix, mvpMatrix, model.transform.modelMatrix)
                    OBI.device.queue.writeBuffer(model.modelUniformBuffer, 128, mvpMatrix as Float32Array)
                })
            })
        })

        const commandEncoder = OBI.device.createCommandEncoder()

        // SHADOW PASS
        this.lights.forEach(light => {
            if (!light.castShadows) return
            if (light.type !== LightType.Directional) return
            const shadowPassDescriptor: GPURenderPassDescriptor = {
                colorAttachments: [],
                depthStencilAttachment: {
                    view: light.shadowProjector.shadowMapView,
                    depthClearValue: 1.0,
                    depthLoadOp: 'clear',
                    depthStoreOp: 'store',
                }
            }

            const shadowPassEndcoder = commandEncoder.beginRenderPass(shadowPassDescriptor)
            shadowPassEndcoder.setPipeline(this.shadowShader.renderPipeline)

            this.materials.forEach((meshes, material) => {
                meshes.forEach((models, mesh) => {
                    // set vertex
                    shadowPassEndcoder.setVertexBuffer(0, mesh.vertexBuffer)
                    shadowPassEndcoder.setIndexBuffer(mesh.indexBuffer, "uint16")
                    models.forEach(model => {
                        if (!model.material.castShadows)
                            return

                        shadowPassEndcoder.setBindGroup(0, model.shadowPassBindGroup)
                        shadowPassEndcoder.setBindGroup(1, this.sceneRessources.lightRessources.get(light).shadowCameraBindGroup)
                        shadowPassEndcoder.drawIndexed(model.mesh.vertexCount)
                    })
                })
            })
            shadowPassEndcoder.end()
        })

        // Z-ONLY LIGHTING PRE PASS
        const zonlyDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [],
            depthStencilAttachment: {
                view: camera.depthMapView,
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
                stencilLoadOp: 'clear',
                stencilStoreOp: 'store'
            }
        }

        const zonlyPassEndcoder = commandEncoder.beginRenderPass(zonlyDescriptor)

        this.materials.forEach((meshes, material) => {
            zonlyPassEndcoder.setPipeline(material.renderPassMap.get(RenderPassType.Opaque_Z_only).renderPipeline)
            meshes.forEach((models, mesh) => {
                // set vertex
                zonlyPassEndcoder.setVertexBuffer(0, mesh.vertexBuffer)
                zonlyPassEndcoder.setIndexBuffer(mesh.indexBuffer, "uint16")
                models.forEach(model => {
                    zonlyPassEndcoder.setBindGroup(0, model.shadowPassBindGroup)
                    zonlyPassEndcoder.setBindGroup(1, this.sceneRessources.bindGroupUnLit)
                    zonlyPassEndcoder.drawIndexed(model.mesh.vertexCount)
                })
            })
        })
        zonlyPassEndcoder.end()

        // SKYBOX RENDER PASS
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
                view: camera.depthMapView,
                depthClearValue: 1.0,
                depthLoadOp: 'load',
                depthStoreOp: 'store',
                stencilLoadOp: 'load',
                stencilStoreOp: 'discard'
            }
        }
        const renderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
        this.environment.drawSkybox(renderPassEncoder, camera)
        renderPassEncoder.end()

        // DIR Light RENDER PASS
        this.lights.forEach(light => {
            if (light.type != LightType.Directional) return

            const renderPassDescriptor: GPURenderPassDescriptor = {
                colorAttachments: [
                    {
                        view: OBI.context.getCurrentTexture().createView(),
                        clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
                        loadOp: 'load',
                        storeOp: 'store'
                    }
                ],
                depthStencilAttachment: {
                    view: camera.depthMapView,
                    depthClearValue: 1.0,
                    depthLoadOp: 'load',
                    depthStoreOp: 'store',
                    stencilLoadOp: 'clear',
                    stencilStoreOp: 'store'
                }
            }

            const renderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)

            this.materials.forEach((meshes, material) => {

                if (material.status != MaterialStatus.Valid) {
                    material.validate()
                }

                renderPassEncoder.setPipeline(material.renderPassMap.get(RenderPassType.Opaque_Directional_Light).renderPipeline)
                if (material.lighting === Lighting.BlinnPhong) {
                    if (material.receivesShadows)
                        renderPassEncoder.setBindGroup(1, this.sceneRessources.lightRessources.get(light).lightBindGroupWithShadows)
                    else
                        renderPassEncoder.setBindGroup(1, this.sceneRessources.lightRessources.get(light).lightBindGroup)
                } else {
                    renderPassEncoder.setBindGroup(1, this.sceneRessources.bindGroupUnLit)
                }

                const standardMat = material as StandardMaterial
                if (standardMat.uniformBindGroups.has(2))
                    renderPassEncoder.setBindGroup(2, standardMat.uniformBindGroups.get(2))

                meshes.forEach((models, mesh) => {

                    // set vertex
                    renderPassEncoder.setVertexBuffer(0, mesh.vertexBuffer)
                    renderPassEncoder.setIndexBuffer(mesh.indexBuffer, "uint16")

                    models.forEach(model => {

                        renderPassEncoder.setBindGroup(0, model.modelBindGroup)

                        // draw vertex count of cube
                        renderPassEncoder.drawIndexed(model.mesh.vertexCount)
                        // webgpu run in a separate process, all the commands will be executed after submit
                    });
                });
            })
            renderPassEncoder.end()
        })

        OBI.device.queue.submit([commandEncoder.finish()])
    }

    addLight(light: Light) {
        this.lights.push(light)
        // if no parent set yet, make root in scene
        if (!light.transform.getParent())
            this.sceneGraph.addChild(light.transform)

        this.sceneRessources.addLightRessources(light)
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
}

class SceneRessources {
    cameraUniformF32Array: Float32Array
    cameraUniformBuffer: GPUBuffer
    ambientLightUniformBuffer: GPUBuffer
    lightRessources: Map<Light, LightRessource>

    bindGroupUnLit: GPUBindGroup

    constructor() {
        this.lightRessources = new Map<Light, LightRessource>()

        const cameraUniformBufferSize = 4 * 4 * 4 + // 4 x 4 float32 view matrix
            4 * 4 * 4 + // 4 x 4 float32 projection matrix
            3 * 4      // 3 * float32 camera position
        this.cameraUniformF32Array = new Float32Array(cameraUniformBufferSize / 4)
        this.cameraUniformBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer Camera Data',
            size: cameraUniformBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
        this.ambientLightUniformBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer Ambient Light Data',
            size: 4 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })

        const bindGroupLayoutEntries = [Shader.DEFAULT_CAMERA_BINDGROUPLAYOUTENTRY]

        const bindGroupEntries: GPUBindGroupEntry[] = [{
            binding: 0,
            resource: {
                buffer: this.cameraUniformBuffer
            }
        }]

        var bindGroupLayout = OBI.device.createBindGroupLayout({ entries: bindGroupLayoutEntries })
        this.bindGroupUnLit = OBI.device.createBindGroup({
            label: 'Scene Unlit Binding Group',
            layout: bindGroupLayout,
            entries: bindGroupEntries
        })
    }

    addLightRessources(light: Light) {
        this.lightRessources.set(light, new LightRessource(light, this.cameraUniformBuffer, this.ambientLightUniformBuffer))
    }

    updateSceneRessources(camera: Camera, ambient: vec4, lights: Light[]) {
        this.cameraUniformF32Array.set(camera.viewMatrix as Float32Array, 0)
        this.cameraUniformF32Array.set(camera.projectionMatrix as Float32Array, 16)
        this.cameraUniformF32Array.set(camera.getPosition() as Float32Array, 32)
        OBI.device.queue.writeBuffer(this.cameraUniformBuffer, 0, this.cameraUniformF32Array)

        OBI.device.queue.writeBuffer(this.ambientLightUniformBuffer, 0, ambient as Float32Array)

        lights.forEach(light => {
            const lightRessource = this.lightRessources.get(light)

            if (light.castShadows) {
                light.shadowProjector.update(camera.getPosition())

                lightRessource.shadowCameraUniformF32Array.set(light.shadowProjector.viewMatrix, 0)
                lightRessource.shadowCameraUniformF32Array.set(light.shadowProjector.projectionMatrix, 16)
                lightRessource.shadowCameraUniformF32Array.set( camera.getPosition(), 32)
                OBI.device.queue.writeBuffer(lightRessource.shadowCameraUniformBuffer, 0, lightRessource.shadowCameraUniformF32Array)

                OBI.device.queue.writeBuffer(lightRessource.lightMatrixUniformBuffer, 0, light.shadowProjector.lightMatrix as Float32Array)
            }

            lightRessource.lightUniformF32Array.set(light.transform.position, 0)
            lightRessource.lightUniformF32Array.set(light.transform.localForward, 4)
            lightRessource.lightUniformF32Array.set(light.color, 8)
            lightRessource.lightUniformF32Array[12] = light.range
            lightRessource.lightUniformF32Array[13] = light.intensity
            lightRessource.lightUniformF32Array[14] = light.innerSpotAngle
            lightRessource.lightUniformF32Array[15] = light.outerSpotAngle
            OBI.device.queue.writeBuffer(lightRessource.lightUniformBuffer, 0, lightRessource.lightUniformF32Array)
        })
    }
}

class LightRessource {
    lightUniformF32Array: Float32Array
    lightUniformBuffer: GPUBuffer
    lightMatrixUniformBuffer: GPUBuffer
    shadowCameraUniformF32Array: Float32Array
    shadowCameraUniformBuffer: GPUBuffer
    lightBindGroupWithShadows: GPUBindGroup
    lightBindGroup: GPUBindGroup
    light: Light
    shadowCameraBindGroup: GPUBindGroup

    constructor(light: Light, cameraUniformBuffer: GPUBuffer, ambientLightBuffer: GPUBuffer) {
        this.light = light

        this.lightMatrixUniformBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer LightMatrix 4x4 matrix',
            size: 4 * 4 * 4, // 4 x 4 float32
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })

        const shadowCameraUniformBufferSize = 4 * 4 * 4 + // 4 x 4 float32 view matrix
            4 * 4 * 4 + // 4 x 4 float32 projection matrix
            3 * 4       // 3 * float32 camera position
        this.shadowCameraUniformF32Array = new Float32Array(shadowCameraUniformBufferSize / 4)
        this.shadowCameraUniformBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer Shadow Camera Data',
            size: shadowCameraUniformBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })

        const lightUniformBufferSize = 4 * 4 + // position
            4 * 4 + // direction
            4 * 4 + // color
            4 + // range
            4 + // intensity
            4 + // inner angle
            4 // outer angle
        this.lightUniformF32Array = new Float32Array(lightUniformBufferSize / 4)
        this.lightUniformBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer Light Data',
            size: lightUniformBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })

        const bindGroupLayoutEntries = [Shader.DEFAULT_CAMERA_BINDGROUPLAYOUTENTRY]
        const bindGroupEntries: GPUBindGroupEntry[] = [{
            binding: 0,
            resource: {
                buffer: cameraUniformBuffer
            }
        }]

        // ambient lighting data binding
        bindGroupLayoutEntries.push({
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
                type: 'uniform',
            }
        })
        bindGroupEntries.push({
            binding: 1, // the ambient info
            resource: {
                buffer: ambientLightBuffer
            }
        })

        // point/dir/spot lighting data binding
        bindGroupLayoutEntries.push({
            binding: 2,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
                type: 'uniform',
            }
        })
        bindGroupEntries.push({
            binding: 2, // the point/dir/spot info
            resource: {
                buffer: this.lightUniformBuffer
            }
        })

        const litBindGroupLayout = OBI.device.createBindGroupLayout({ entries: bindGroupLayoutEntries })
        this.lightBindGroup = OBI.device.createBindGroup({
            label: 'Scene Lit Binding Group',
            layout: litBindGroupLayout,
            entries: bindGroupEntries
        })

        // shadow bind group
        Shader.DEFAULT_SHADOW_BINDGROUPENTRIES.forEach(value => bindGroupLayoutEntries.push(value))
        bindGroupEntries.push({
            binding: 3,
            resource: light.shadowProjector.shadowMapView
        })
        bindGroupEntries.push({
            binding: 4,
            resource: OBI.device.createSampler({    // use comparison sampler for shadow mapping
                compare: 'less',
            })
        })
        bindGroupEntries.push({
            binding: 5,
            resource: { buffer: this.lightMatrixUniformBuffer }
        })

        const shadowsBindGroupLayout = OBI.device.createBindGroupLayout({ entries: bindGroupLayoutEntries })
        this.lightBindGroupWithShadows = OBI.device.createBindGroup({
            label: 'Scene Binding Group',
            layout: shadowsBindGroupLayout,
            entries: bindGroupEntries
        })

        const shadowCameraBindGroupLayout = OBI.device.createBindGroupLayout({ entries: [Shader.DEFAULT_CAMERA_BINDGROUPLAYOUTENTRY] })
        this.shadowCameraBindGroup = OBI.device.createBindGroup({
            label: 'Shadow Camera Bind Group',
            layout: shadowCameraBindGroupLayout,
            entries: [{
                binding: 0, // camera data
                resource: {
                    buffer: this.shadowCameraUniformBuffer
                }
            }]
        })
    }
}

