import { Material, MaterialStatus } from "./material"
import OBI from "./obi"
import { RenderPassType } from "./renderer/renderpass"
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
        this.updateFlags()
        this.renderPassMap.set(RenderPassType.Opaque_Base, ShaderLibrary.getBasePassShader(this.flags, this.uniformLayouts))
        if(this.flags.has(Shader.BLINNPHONG_LIGHTING_FLAG)){
            this.renderPassMap.set(RenderPassType.Opaque_Z_only, ShaderLibrary.getZ_OnlyPassShader())
            this.renderPassMap.set(RenderPassType.Opaque_Directional_Light, ShaderLibrary.getAdditiveDirLightShader(this.flags, this.uniformLayouts))
            this.renderPassMap.set(RenderPassType.Opaque_Point_Light, ShaderLibrary.getAdditivePointLightShader(this.flags, this.uniformLayouts))
            this.renderPassMap.set(RenderPassType.Opaque_Spot_Light, ShaderLibrary.getAdditiveSpotLightShader(this.flags, this.uniformLayouts))
        }
        if(this.flags.has(Shader.CAST_SHADOWS_FLAG)){
            this.renderPassMap.set(RenderPassType.Opaque_Shadow, ShaderLibrary.getShadowShader())
        }
        this.createMaterialBindGroups()
        this.status = MaterialStatus.Valid
    }
}