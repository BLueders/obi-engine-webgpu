import { Material, MaterialStatus } from "./material"
import OBI from "./obi"
import Shader from "./shader"
import { Lighting, ShaderLibrary } from "./shader-library"
import { Texture } from "./texture"
import { Uniform, BufferUniform, TextureUniform, SamplerUniform } from "./uniform"

export default class LitMaterial extends Material {

    constructor() {
        super()
        this.flags.add(Shader.BLINNPHONG_LIGHTING_FLAG)
        this.flags.add(Shader.RECEIVE_SHADOWS_FLAG)
    }

    validate(): void {
        this.uniformLayouts = this.getUniformLayouts()
        this.shader = ShaderLibrary.getCustomShader(this.flags, this.uniformLayouts)
        this.createSceneBindGroup()
        this.createMaterialBindGroups()
        if (this.shader) {
            this.status = MaterialStatus.Valid
        }
    }

    addUniform(uniform: Uniform) {
        if(!this.uniforms.get(uniform.group))
            this.uniforms.set(uniform.group, new Map<number, Uniform>())
        if (this.uniforms.get(uniform.group).get(uniform.binding))
            throw new Error(`Another Uniform is already bound to group: ${uniform.group}, binding: ${uniform.binding}. ${JSON.stringify(this.uniforms.get(uniform.group).get(uniform.binding))}`)
        if (!this.uniforms.get(uniform.group))
            this.uniforms.set(uniform.group, new Map<number, Uniform>())
        this.uniforms.get(uniform.group).set(uniform.binding, uniform)
        this.status = MaterialStatus.NeedsUpdate
    }

    getUniform<T>(group: number, binding: number): T {
        const uniform = this.uniforms.get(group).get(binding)
        return uniform as any
    }

    setUniformBufferValues(group: number, binding: number, bufferOffset: number, data: BufferSource | SharedArrayBuffer, dataOffset?: number, size?: number) {
        const uniform = this.uniforms.get(group).get(binding) as BufferUniform
        OBI.device.queue.writeBuffer(uniform.buffer, bufferOffset, data, dataOffset, size)
    }

    setUniformTexture(group: number, binding: number, texture: Texture) {
        const uniform = this.uniforms.get(group).get(binding) as TextureUniform
        uniform.texture = texture
        this.status = MaterialStatus.NeedsUpdate
    }

    createMaterialBindGroups() {
        this.uniforms.forEach((uniformGroup, groupID) => {

            const entries: GPUBindGroupEntry[] = []
            uniformGroup.forEach((uniform, bindingID) => {

                if (uniform instanceof BufferUniform) {
                    entries.push({
                        binding: uniform.binding, // the directional and ambient info
                        resource: {
                            buffer: uniform.buffer
                        }
                    })
                }

                if (uniform instanceof TextureUniform) {
                    entries.push({
                        binding: bindingID,
                        resource: uniform.texture.gpuTexture.createView()
                    })
                }

                if (uniform instanceof SamplerUniform) {
                    entries.push({
                        binding: uniform.binding,
                        resource: OBI.device.createSampler(uniform.samplerDescriptor)
                    })
                }
            })
            const bindGroupLayout = this.uniformLayouts.get(groupID)
            this.uniformBindGroups.set(groupID, OBI.device.createBindGroup({
                label: 'Material Uniform Bind Group: ' + groupID,
                layout: bindGroupLayout,
                entries: entries
            }))
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

        const sceneBindGroupLayout = OBI.device.createBindGroupLayout({ entries: Shader.getStandardSceneBindGroupEntries(this.flags) })
        this.sceneBindGroup = OBI.device.createBindGroup({
            label: 'Scene Binding Group',
            layout: sceneBindGroupLayout,
            entries: entries
        })
    }

    getUniformLayouts() {
      
        const uniformLayoutGroups = new Map<number, GPUBindGroupLayout>()
        this.uniforms.forEach((uniformGroup, groupID) => {

            const uniformBindGroupLayoutEntries: GPUBindGroupLayoutEntry[] = []
            uniformGroup.forEach((uniform, bindingID) => {

                if (uniform instanceof BufferUniform) {
                    uniformBindGroupLayoutEntries.push({
                        binding: bindingID,
                        visibility: uniform.visibility,
                        buffer: {
                            type: 'uniform',
                        }
                    })
                }

                if (uniform instanceof TextureUniform) {
                    uniformBindGroupLayoutEntries.push({
                        binding: bindingID,
                        visibility: uniform.visibility,
                        texture: {
                            sampleType: uniform.sampleType,
                            viewDimension: uniform.viewDimension,
                            multisampled: uniform.multisampled
                        }
                    })
                }

                if (uniform instanceof SamplerUniform) {
                    uniformBindGroupLayoutEntries.push({
                        binding: bindingID,
                        visibility: uniform.visibility,
                        sampler: {
                            type: uniform.samplerType,
                        }
                    })
                }
            })

            const bindGroupLayout = OBI.device.createBindGroupLayout({ entries: uniformBindGroupLayoutEntries })
            uniformLayoutGroups.set(groupID, bindGroupLayout)
        })
        return uniformLayoutGroups
    }
}