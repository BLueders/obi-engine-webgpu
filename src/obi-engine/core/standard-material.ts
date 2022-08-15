import OBI from "./obi"
import { Lighting, ShaderLibrary } from "./shader-library"
import Shader from "./shader"
import { Texture } from "./texture"
import LitMaterial from "./lit-material"
import { vec4 } from "gl-matrix"
import { MaterialStatus } from "./material"
import { BufferUniform, RGBASamplerUniform, RGBATextureUniform, SamplerUniform, TextureUniform } from "./uniform"
import TypeSize from "../utils/typesize"

export default class StandardMaterial extends LitMaterial {

    static MATERIAL_GROUP = 2
    static TINT_BINDING = 0
    static SAMPLER_BINDING = 1
    static ALBEDO_MAP_BINDING = 2
    static NORMAL_MAP_BINDING = 3
    static ROUGHNESS_MAP_BINDING = 4
    static METALLIC_MAP_BINDING = 5
    static HEIGHT_MAP_BINDING = 6
    static AO_MAP_BINDING = 7
    static EMISSIVE_MAP_BINDING = 8

    tint: vec4

    constructor(tint: vec4) {
        super()
        this.tint = tint
        this.flags.add(Shader.HAS_TINT_COLOR_FLAG)
        this.addUniform(new BufferUniform(StandardMaterial.MATERIAL_GROUP, StandardMaterial.TINT_BINDING, GPUShaderStage.FRAGMENT, TypeSize.float32x4, "Tint Color"))
        this.setUniformBufferValues(StandardMaterial.MATERIAL_GROUP, StandardMaterial.TINT_BINDING, 0, tint as Float32Array)
    }

    updateFlags(): void {
        this.setFlag(!!this.getUniform(StandardMaterial.MATERIAL_GROUP, StandardMaterial.TINT_BINDING), Shader.HAS_TINT_COLOR_FLAG)
        this.setFlag(!!this.getUniform(StandardMaterial.MATERIAL_GROUP, StandardMaterial.ALBEDO_MAP_BINDING), Shader.HAS_ALBEDO_MAP_FLAG)
        this.setFlag(!!this.getUniform(StandardMaterial.MATERIAL_GROUP, StandardMaterial.NORMAL_MAP_BINDING), Shader.HAS_NORMAL_MAP_FLAG)
        this.setFlag(!!this.getUniform(StandardMaterial.MATERIAL_GROUP, StandardMaterial.ROUGHNESS_MAP_BINDING), Shader.HAS_ROUGHNESS_MAP_FLAG)
        this.setFlag(!!this.getUniform(StandardMaterial.MATERIAL_GROUP, StandardMaterial.METALLIC_MAP_BINDING), Shader.HAS_METALLIC_MAP_FLAG)
        this.setFlag(!!this.getUniform(StandardMaterial.MATERIAL_GROUP, StandardMaterial.HEIGHT_MAP_BINDING), Shader.HAS_HEIGHT_MAP_FLAG)
        this.setFlag(!!this.getUniform(StandardMaterial.MATERIAL_GROUP, StandardMaterial.AO_MAP_BINDING), Shader.HAS_AO_MAP_FLAG)
        this.setFlag(!!this.getUniform(StandardMaterial.MATERIAL_GROUP, StandardMaterial.EMISSIVE_MAP_BINDING), Shader.HAS_EMISSIVE_MAP_FLAG)

        super.updateFlags()
    }

    setAlbedoMap(texture: Texture) {
        this.checkSamplerExists()
        if (!this.getUniform(StandardMaterial.MATERIAL_GROUP, StandardMaterial.ALBEDO_MAP_BINDING)) {
            this.addUniform(new RGBATextureUniform(StandardMaterial.MATERIAL_GROUP,
                StandardMaterial.ALBEDO_MAP_BINDING,
                GPUShaderStage.FRAGMENT,
                texture,
                "Albedo map Uniform"))
        } else {
            this.setUniformTexture(StandardMaterial.MATERIAL_GROUP, StandardMaterial.ALBEDO_MAP_BINDING, texture)
        }
        this.status = MaterialStatus.NeedsUpdate
    }

    setNormalMap(texture: Texture) {
        this.checkSamplerExists()
        if (!this.getUniform(StandardMaterial.MATERIAL_GROUP, StandardMaterial.NORMAL_MAP_BINDING)) {
            this.addUniform(new RGBATextureUniform(StandardMaterial.MATERIAL_GROUP,
                StandardMaterial.NORMAL_MAP_BINDING,
                GPUShaderStage.FRAGMENT,
                texture,
                "Normal map Uniform"))
        } else {
            this.setUniformTexture(StandardMaterial.MATERIAL_GROUP, StandardMaterial.NORMAL_MAP_BINDING, texture)
        }
        this.status = MaterialStatus.NeedsUpdate
    }

    setRoughnessMap(texture: Texture) {
        this.checkSamplerExists()
        if (!this.getUniform(StandardMaterial.MATERIAL_GROUP, StandardMaterial.ROUGHNESS_MAP_BINDING)) {
            this.addUniform(new RGBATextureUniform(StandardMaterial.MATERIAL_GROUP,
                StandardMaterial.ROUGHNESS_MAP_BINDING,
                GPUShaderStage.FRAGMENT,
                texture,
                "Roughness map Uniform"))
        } else {
            this.setUniformTexture(StandardMaterial.MATERIAL_GROUP, StandardMaterial.ROUGHNESS_MAP_BINDING, texture)
        }
        this.status = MaterialStatus.NeedsUpdate
    }

    setMetallicMap(texture: Texture) {
        this.checkSamplerExists()
        if (!this.getUniform(StandardMaterial.MATERIAL_GROUP, StandardMaterial.METALLIC_MAP_BINDING)) {
            this.addUniform(new RGBATextureUniform(StandardMaterial.MATERIAL_GROUP,
                StandardMaterial.METALLIC_MAP_BINDING,
                GPUShaderStage.FRAGMENT,
                texture,
                "Metallic map Uniform"))
        } else {
            this.setUniformTexture(StandardMaterial.MATERIAL_GROUP, StandardMaterial.METALLIC_MAP_BINDING, texture)
        }
        this.status = MaterialStatus.NeedsUpdate
    }

    setHeightMap(texture: Texture) {
        this.checkSamplerExists()
        if (!this.getUniform(StandardMaterial.MATERIAL_GROUP, StandardMaterial.HEIGHT_MAP_BINDING)) {
            this.addUniform(new RGBATextureUniform(StandardMaterial.MATERIAL_GROUP,
                StandardMaterial.HEIGHT_MAP_BINDING,
                GPUShaderStage.FRAGMENT,
                texture,
                "Height map Uniform"))
        } else {
            this.setUniformTexture(StandardMaterial.MATERIAL_GROUP, StandardMaterial.HEIGHT_MAP_BINDING, texture)
        }
        this.status = MaterialStatus.NeedsUpdate
    }

    setAOMap(texture: Texture) {
        this.checkSamplerExists()
        if (!this.getUniform(StandardMaterial.MATERIAL_GROUP, StandardMaterial.AO_MAP_BINDING)) {
            this.addUniform(new RGBATextureUniform(StandardMaterial.MATERIAL_GROUP,
                StandardMaterial.AO_MAP_BINDING,
                GPUShaderStage.FRAGMENT,
                texture,
                "AO map Uniform"))
        } else {
            this.setUniformTexture(StandardMaterial.MATERIAL_GROUP, StandardMaterial.AO_MAP_BINDING, texture)
        }
        this.status = MaterialStatus.NeedsUpdate
    }

    setEmissiveMap(texture: Texture) {
        this.checkSamplerExists()
        if (!this.getUniform(StandardMaterial.MATERIAL_GROUP, StandardMaterial.EMISSIVE_MAP_BINDING)) {
            this.addUniform(new RGBATextureUniform(StandardMaterial.MATERIAL_GROUP,
                StandardMaterial.EMISSIVE_MAP_BINDING,
                GPUShaderStage.FRAGMENT,
                texture,
                "Emissive map Uniform"))
        } else {
            this.setUniformTexture(StandardMaterial.MATERIAL_GROUP, StandardMaterial.EMISSIVE_MAP_BINDING, texture)
        }
        this.status = MaterialStatus.NeedsUpdate
    }

    checkSamplerExists() {
        if (!this.getUniform(StandardMaterial.MATERIAL_GROUP, StandardMaterial.SAMPLER_BINDING)) {
            this.addUniform(new RGBASamplerUniform(
                StandardMaterial.MATERIAL_GROUP,
                StandardMaterial.SAMPLER_BINDING,
                GPUShaderStage.FRAGMENT,
                "Standard Sampler"))
            this.status = MaterialStatus.NeedsUpdate
        }
    }

    setTint(tint: vec4) {
        this.tint = tint
        this.setUniformBufferValues(StandardMaterial.MATERIAL_GROUP, StandardMaterial.TINT_BINDING, 0, tint as Float32Array)
    }

    hasTextures() {
        return !!this.getUniform(StandardMaterial.MATERIAL_GROUP, StandardMaterial.SAMPLER_BINDING)
    }

    validate(): void {
        this.uniformLayouts = this.getUniformLayouts()
        this.updateFlags()
        this.shader = ShaderLibrary.getStandardShader(this.flags)
        if (this.shader) {
            this.status = MaterialStatus.Valid
        }
        this.createSceneBindGroup()
        this.createMaterialBindGroups()
        if (this.shader) {
            this.status = MaterialStatus.Valid
        }
    }
}