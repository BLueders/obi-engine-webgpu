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
        //this.createSceneBindGroup()
        this.createMaterialBindGroups()
        if (this.shader) {
            this.status = MaterialStatus.Valid
        }
    }
}