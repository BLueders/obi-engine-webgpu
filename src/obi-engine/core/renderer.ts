import { vec3 } from "gl-matrix"
import { Camera } from "./camera"
import { Light } from "./light"
import Model from "./model"
import OBI from "./obi"
import { Lighting, PipelineLibrary } from "./pipeline-library"
import Scene from "./scene"

export default class Renderer {

    model: Model

    pipeline: GPURenderPipeline
    materialBindGroup: GPUBindGroup

    modelMatrixBuffer: GPUBuffer
    invTransBuffer: GPUBuffer
    pointLightBuffer: GPUBuffer

    matrixBindGroup: GPUBindGroup
    shadowpassMatrixBindGroup: GPUBindGroup
    lightingBindGroup: GPUBindGroup
    shadowPassBindGroup: GPUBindGroup

    receivesShadows: boolean
    castsShadows: boolean
    lighting: Lighting

    constructor(model: Model) {
        this.model = model

        this.receivesShadows = true
        this.castsShadows = true
        this.lighting = Lighting.BlinnPhong
    }

    createMatrixBuffers() {
        this.modelMatrixBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer Model 4x4 matrix',
            size: 4 * 4 * 4, // 4 x 4 x float32
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })

        this.invTransBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer Inverse Transpose 3x3 matrix',
            //TODO: WGSL cant do a 3 component vector as a uniform as part of a matrix (only single) in matrices there has to be 16 bytes per entry
            size: 4 * 4 * 4, // 3 x 3 x float32
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
    }

    createMaterialBindGroup() {
        // Create a sampler with linear filtering for smooth interpolation.
        const sampler = OBI.device.createSampler({
            addressModeU: 'repeat',
            addressModeV: 'repeat',
            magFilter: 'linear',
            minFilter: 'linear'
        })

        // create color buffer
        const colorBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer store rgba color',
            size: 4 * 4, // 4 * float32
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        OBI.device.queue.writeBuffer(colorBuffer, 0, this.model.material.tint as Float32Array)

        const entries = []
        entries.push({
            binding: 0, // the color buffer
            resource: {
                buffer: colorBuffer
            }
        })

        if (this.model.material.albedoMap || this.model.material.normalMap) {
            entries.push({
                binding: 1, // the sampler
                resource: sampler
            })
        }

        if (this.model.material.albedoMap) {
            entries.push({
                binding: 2, // albedo texture
                resource: this.model.material.albedoMap.gpuTexture.createView()
            })
        }

        if (this.model.material.normalMap) {
            entries.push({
                binding: 3, // albedo texture
                resource: this.model.material.normalMap.gpuTexture.createView()
            })
        }

        this.materialBindGroup = OBI.device.createBindGroup({

            label: 'Texture Group with Texture/Sampler',
            layout: this.pipeline.getBindGroupLayout(1),
            entries: entries
        })
    }

    configureForScene(scene: Scene) {
        this.pipeline = PipelineLibrary.getPipeline(this.model, this.model.material, this)
        this.createMaterialBindGroup()
        this.createMatrixBuffers()
        this.createMatrixBindGroups(scene)
        this.createShadowMatrixBindGroups(scene)
        this.createLightBindGroup(scene)
    }

    createMatrixBindGroups(scene: Scene) {

        const entries = [{
            binding: 0, // model matrix
            resource: {
                buffer: this.model.renderer.modelMatrixBuffer
            }
        }, {
            binding: 1, // view matrix
            resource: {
                buffer: scene.mainCamera.viewBuffer
            }
        }, {
            binding: 2, // proj matrix
            resource: {
                buffer: scene.mainCamera.projBuffer
            }
        },{
            binding: 3, // the inv trans matrix
            resource: {
                buffer: this.model.renderer.invTransBuffer
            }
        }, {
            binding: 4, // the cam pos
            resource: {
                buffer: scene.mainCamera.camPosBuffer
            }
        }]
        
        this.matrixBindGroup = OBI.device.createBindGroup({
            label: 'matrix bind group',
            layout: this.model.renderer.pipeline.getBindGroupLayout(0),
            entries: entries
        })

    }

    createShadowMatrixBindGroups(scene: Scene) {

        const entries = [{
            binding: 0, // model matrix
            resource: {
                buffer: this.model.renderer.modelMatrixBuffer
            }
        }, {
            binding: 1, // view matrix
            resource: {
                buffer: scene.dirLight.shadowProjector.viewBuffer
            }
        }, {
            binding: 2, // proj matrix
            resource: {
                buffer: scene.dirLight.shadowProjector.projBuffer
            }
        }]
        
        this.shadowpassMatrixBindGroup = OBI.device.createBindGroup({
            label: 'shadow matrix bind group',
            layout: scene.shadowPipeline.getBindGroupLayout(0),
            entries: entries
        })
    }

    createLightBindGroup(scene: Scene) {
        if (this.lighting === Lighting.Unlit)
            return

        this.pointLightBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer for lighting data',
            size: 3 * 4 * 4 * 3, // 3 * vec4<float32> * 3 point lights
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })

        const entries: GPUBindGroupEntry[] = []

        entries.push({
            binding: 0, // the directional and ambient info
            resource: {
                buffer: scene.dirAmbientBuffer
            }
        })

        // @group(2) @binding(1) var dirShadowMap: texture_depth_2d;
        // @group(2) @binding(2) var shadowSampler: sampler_comparison;
        // @group(2) @binding(3) var dirLightMatrix: mat4x4<f32>;
        if (this.receivesShadows) {
            entries.push({
                binding: 1,
                resource: scene.dirLight.shadowProjector.shadowMapView
            })
            entries.push({
                binding: 2,
                resource: OBI.device.createSampler({    // use comparison sampler for shadow mapping
                    compare: 'less',
                })
            })
            entries.push({
                binding: 3,
                resource: { buffer: scene.dirLight.shadowProjector.lightMatrixBuffer }
            })
        }
        entries.push({
            binding: 4, // the point light info
            resource: {
                buffer: this.pointLightBuffer
            }
        })
        this.lightingBindGroup = OBI.device.createBindGroup({
            label: 'Light Binding Group',
            layout: this.pipeline.getBindGroupLayout(2),
            entries: entries
        })
    }

    updatePointLightBuffer(lights: Light[]) {
        if (this.lighting === Lighting.Unlit)
            return
        if (lights.length >= 3) { // if less than 4 point lights, no sorting required
            const pointLightSortingFunction = (lightA: Light, lightB: Light) => {
                const distA = vec3.sqrDist(this.model.transform.position, lightA.transform.position)
                const distB = vec3.sqrDist(this.model.transform.position, lightB.transform.position)
                if (distA < distB) {
                    return -1;
                }
                if (distA > distB) {
                    return 1;
                }
                return 0;
            }
            lights.sort(pointLightSortingFunction)
        }

        const lightData = new Float32Array(3 * 3 * 4) // 3 point lights with 3 vec4
        lightData.fill(0)
        for (let i = 0; i < lights.length && i < 3; i++) {
            lightData.set(lights[i].transform.position, i * 12)
            lightData.set(lights[i].color, i * 12 + 4)
            lightData[i * 12 + 8] = lights[i].range
            lightData[i * 12 + 9] = lights[i].intensity
        }

        OBI.device.queue.writeBuffer(this.pointLightBuffer, 0, lightData)
    }
}