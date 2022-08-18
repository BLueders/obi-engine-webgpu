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

export default class Scene {

    sceneGraph: SceneGraph

    environment: Environment
    mainCamera: Camera
    ambientLight: vec4
    dirLight: Light
    pointlights: Light[]

    dirAmbientBuffer: GPUBuffer
    materials: Map<Material, Map<Mesh, Model[]>>
    sceneBindGroups: Map<Camera, SceneBindGroupSetup>
    shadowShader: Shader

    constructor(environment: Environment) {
        this.sceneGraph = new SceneGraph()

        this.mainCamera = new Camera()
        this.materials = new Map<Material, Map<Mesh, Model[]>>()
        this.sceneBindGroups = new Map<Camera, SceneBindGroupSetup>()
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
        this.sceneBindGroups.set(this.mainCamera, new SceneBindGroupSetup(this, this.mainCamera))
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
        if(!this.sceneBindGroups.has(camera))
            this.sceneBindGroups.set(camera, new SceneBindGroupSetup(this, camera))
        const sceneBindGroup = this.sceneBindGroups.get(camera)

        this.updateAmbientDirLights()

        this.sceneGraph.updateGraph()
        this.dirLight.shadowProjector.update(this)

        OBI.device.queue.writeBuffer(this.dirLight.shadowProjector.shadowCameraUniformBuffer, 0, this.dirLight.shadowProjector.viewMatrix as Float32Array)
        OBI.device.queue.writeBuffer(this.dirLight.shadowProjector.shadowCameraUniformBuffer, 64, this.dirLight.shadowProjector.projectionMatrix as Float32Array)
        OBI.device.queue.writeBuffer(this.dirLight.shadowProjector.shadowCameraUniformBuffer, 128, camera.getPosition() as Float32Array)

        OBI.device.queue.writeBuffer(camera.cameraUniformBuffer, 0, camera.viewMatrix as Float32Array)
        OBI.device.queue.writeBuffer(camera.cameraUniformBuffer, 64, camera.projectionMatrix as Float32Array)
        OBI.device.queue.writeBuffer(camera.cameraUniformBuffer, 128, camera.getPosition() as Float32Array)

        OBI.device.queue.writeBuffer(this.dirLight.shadowProjector.lightMatrixUniformBuffer, 0, this.dirLight.shadowProjector.lightMatrix as Float32Array)

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
                    model.updatePointLightBuffer(this.pointlights)
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
                    shadowPassEndcoder.setBindGroup(1, this.dirLight.shadowProjector.shadowCameraBindGroup)
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
                view: camera.depthMapView,
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            }
        }

        const renderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)

        this.environment.drawSkybox(renderPassEncoder, camera)

        this.materials.forEach((meshes, material) => {

            if (material.status != MaterialStatus.Valid) {
                material.validate()
            }

            renderPassEncoder.setPipeline(material.shader.renderPipeline)
            if(material.lighting === Lighting.BlinnPhong){
                if(material.receivesShadows)
                    renderPassEncoder.setBindGroup(1, sceneBindGroup.bindGroupLitShadows)
                else
                    renderPassEncoder.setBindGroup(1, sceneBindGroup.bindGroupLit)
            } else{
                renderPassEncoder.setBindGroup(1, sceneBindGroup.bindGroupUnLit)
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

class SceneBindGroupSetup {
    camera: Camera
    scene: Scene
    lighting: Lighting
    bindGroupUnLit: GPUBindGroup
    bindGroupLit: GPUBindGroup
    bindGroupLitShadows: GPUBindGroup

    constructor(scene: Scene, camera: Camera) {
        this.scene = scene
        this.camera = camera

        // Make unlit bind group
        const bindGroupLayoutEntries = [Shader.DEFAULT_CAMERA_BINDGROUPLAYOUTENTRY]
        const bindGroupEntries: GPUBindGroupEntry[] = [{
            binding: 0, // the directional and ambient info
            resource: {
                buffer: camera.cameraUniformBuffer
            }
        }]

        var bindGroupLayout = OBI.device.createBindGroupLayout({ entries: bindGroupLayoutEntries })
        this.bindGroupUnLit = OBI.device.createBindGroup({
            label: 'Scene Unlit Binding Group',
            layout: bindGroupLayout,
            entries: bindGroupEntries
        })

        // make lit bind group
        bindGroupLayoutEntries.push(Shader.DEFAULT_DIRLIGHTING_BINDGROUPLAYOUTENTRY)
        bindGroupEntries.push({
            binding: 1, // the directional and ambient info
            resource: {
                buffer: scene.dirAmbientBuffer
            }
        })

        bindGroupLayout = OBI.device.createBindGroupLayout({ entries: bindGroupLayoutEntries })
        this.bindGroupLit = OBI.device.createBindGroup({
            label: 'Scene Lit Binding Group',
            layout: bindGroupLayout,
            entries: bindGroupEntries
        })

        // shadow bind group
        Shader.DEFAULT_SHADOW_BINDGROUPENTRIES.forEach(value => bindGroupLayoutEntries.push(value))
        bindGroupEntries.push({
            binding: 2,
            resource: scene.dirLight.shadowProjector.shadowMapView
        })
        bindGroupEntries.push({
            binding: 3,
            resource: OBI.device.createSampler({    // use comparison sampler for shadow mapping
                compare: 'less',
            })
        })
        bindGroupEntries.push({
            binding: 4,
            resource: { buffer: scene.dirLight.shadowProjector.lightMatrixUniformBuffer }
        })

        bindGroupLayout = OBI.device.createBindGroupLayout({ entries: bindGroupLayoutEntries })
        this.bindGroupLitShadows = OBI.device.createBindGroup({
            label: 'Scene Binding Group',
            layout: bindGroupLayout,
            entries: bindGroupEntries
        })
    }
}

