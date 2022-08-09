import { vec3, vec4 } from "gl-matrix"
import { Light } from "./light"
import { Material, MaterialStatus } from "./material"
import OBI from "./obi"
import { Lighting, ShaderLibrary } from "./shader-library"
import Scene from "./scene"
import Shader from "./shader"
import StandardShader from "./standard-shader"
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
        this.setFlag(!!this.aoMap, Shader.HAS_NORMAL_MAP_FLAG)
        this.setFlag(!!this.emmissiveMap, Shader.HAS_EMISSIVE_MAP_FLAG)

        super.updateFlags()
    }

    validate(): void {
        this.updateFlags()
        this.shader = ShaderLibrary.getStandardShader(this.flags)
        if (this.shader) {
            this.status = MaterialStatus.Valid
        }
        this.createTextureBindGroup()
    }

    createTextureBindGroup() {
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

        if (this.albedoMap || this.normalMap) {
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

        (this.shader as StandardShader).materialBindGroup = OBI.device.createBindGroup({
            label: 'Texture Group with Texture/Sampler',
            layout: this.shader.renderPipeline.getBindGroupLayout(1),
            entries: entries
        })
    }

    bindScene(scene: Scene) {
        super.bindScene(scene)

        if (this.lighting === Lighting.Unlit)
            return

        (this.shader as StandardShader).pointLightBuffer = OBI.device.createBuffer({
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
                resource: { buffer: (this.shader as StandardShader).lightMatrixBuffer }
            })
        }

        entries.push({
            binding: 4, // the point light info
            resource: {
                buffer: (this.shader as StandardShader).pointLightBuffer
            }
        });

        (this.shader as StandardShader).lightingBindGroup = OBI.device.createBindGroup({
            label: 'Light Binding Group',
            layout: this.shader.renderPipeline.getBindGroupLayout(2),
            entries: entries
        })
    }

    updatePointLightBuffer(lights: Light[], modelPosition: vec3) {
        if (this.lighting === Lighting.Unlit)
            return
        if (lights.length >= 3) { // if less than 4 point lights, no sorting required
            const pointLightSortingFunction = (lightA: Light, lightB: Light) => {
                const distA = vec3.sqrDist(modelPosition, lightA.transform.position)
                const distB = vec3.sqrDist(modelPosition, lightB.transform.position)
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

        OBI.device.queue.writeBuffer((this.shader as StandardShader).pointLightBuffer, 0, lightData)
    }
}