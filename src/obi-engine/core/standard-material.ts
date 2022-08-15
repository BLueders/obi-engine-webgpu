import { vec3, vec4 } from "gl-matrix"
import { Light } from "./light"
import { Material, MaterialStatus } from "./material"
import OBI from "./obi"
import { Lighting, ShaderLibrary } from "./shader-library"
import Scene from "./scene"
import Shader from "./shader"
import { Texture } from "./texture"

export default class StandardMaterial extends Material {

    tint: vec4
    albedoMap: Texture
    normalMap: Texture
    roughnessMap: Texture
    metallicMap: Texture
    heightMap: Texture
    aoMap: Texture
    emmissiveMap: Texture

    constructor(tint: vec4) {
        super()
        this.tint = tint
        this.flags.add(Shader.HAS_TINT_COLOR_FLAG)
    }

    updateFlags(): void {
        this.setFlag(!!this.tint, Shader.HAS_TINT_COLOR_FLAG)
        this.setFlag(!!this.albedoMap, Shader.HAS_ALBEDO_MAP_FLAG)
        this.setFlag(!!this.normalMap, Shader.HAS_NORMAL_MAP_FLAG)
        this.setFlag(!!this.roughnessMap, Shader.HAS_ROUGHNESS_MAP_FLAG)
        this.setFlag(!!this.metallicMap, Shader.HAS_METALLIC_MAP_FLAG)
        this.setFlag(!!this.heightMap, Shader.HAS_HEIGHT_MAP_FLAG)
        this.setFlag(!!this.aoMap, Shader.HAS_AO_MAP_FLAG)
        this.setFlag(!!this.emmissiveMap, Shader.HAS_EMISSIVE_MAP_FLAG)

        super.updateFlags()
    }

    hasTextures() {
        return !!this.albedoMap || !!this.normalMap || !!this.roughnessMap || !!this.metallicMap || !!this.heightMap || !!this.aoMap || !!this.emmissiveMap
    }

    validate(): void {
        this.updateFlags()
        this.shader = ShaderLibrary.getStandardShader(this.flags)
        if (this.shader) {
            this.status = MaterialStatus.Valid
        }
        this.createSceneBindGroup()
        this.createMaterialBindGroup()
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
        OBI.device.queue.writeBuffer(colorBuffer, 0, this.tint as Float32Array)

        const entries = []
        entries.push({
            binding: 0, // the color buffer
            resource: {
                buffer: colorBuffer
            }
        })

        if (this.hasTextures()) {
            entries.push({
                binding: 1, // the sampler
                resource: sampler
            })
        }

        if (this.albedoMap) {
            entries.push({
                binding: 2, // albedo texture
                resource: this.albedoMap.gpuTexture.createView()
            })
        }

        if (this.normalMap) {
            entries.push({
                binding: 3, // normalMap texture
                resource: this.normalMap.gpuTexture.createView()
            })
        }

        if (this.roughnessMap) {
            entries.push({
                binding: 4, // roughnessMap texture
                resource: this.roughnessMap.gpuTexture.createView()
            })
        }

        if (this.metallicMap) {
            entries.push({
                binding: 5, // metallicMap texture
                resource: this.metallicMap.gpuTexture.createView()
            })
        }

        if (this.heightMap) {
            entries.push({
                binding: 6, // heightMap texture
                resource: this.heightMap.gpuTexture.createView()
            })
        }

        if (this.aoMap) {
            entries.push({
                binding: 7, // aoMap texture
                resource: this.aoMap.gpuTexture.createView()
            })
        }

        if (this.emmissiveMap) {
            entries.push({
                binding: 8, // emmissiveMap texture
                resource: this.emmissiveMap.gpuTexture.createView()
            })
        }

        const materialBindGroupLayout = OBI.device.createBindGroupLayout({entries: Shader.getStandardMaterialBindGroupEntries(this.flags)})
        this.materialBindGroup = OBI.device.createBindGroup({
            label: 'Material Group with Texture/Sampler',
            layout: materialBindGroupLayout,
            entries: entries
        })
    }

    createSceneBindGroup() {
        const entries: GPUBindGroupEntry[] = []

        entries.push({
            binding: 0, // the directional and ambient info
            resource: {
                buffer: this.scene.mainCamera.cameraUniformBuffer
            }
        })

        if (this.lighting === Lighting.BlinnPhong)
            entries.push({
                binding: 1, // the directional and ambient info
                resource: {
                    buffer: this.scene.dirAmbientBuffer
                }
            })

        if (this.receivesShadows) {
            entries.push({
                binding: 2,
                resource: this.scene.dirLight.shadowProjector.shadowMapView
            })
            entries.push({
                binding: 3,
                resource: OBI.device.createSampler({    // use comparison sampler for shadow mapping
                    compare: 'less',
                })
            })
            entries.push({
                binding: 4,
                resource: { buffer: this.scene.dirLight.shadowProjector.lightMatrixUniformBuffer }
            })
        }

        const sceneBindGroupLayout = OBI.device.createBindGroupLayout({entries: Shader.getStandardSceneBindGroupEntries(this.flags)})
        this.sceneBindGroup = OBI.device.createBindGroup({
            label: 'Scene Binding Group',
            layout: sceneBindGroupLayout,
            entries: entries
        })
    }
}