import { vec4 } from "gl-matrix"
import { Lighting } from "./pipeline-library"
import { Texture } from "./texture"

export default class Material {

    lighting:Lighting

    tint: vec4
    albedoMap: Texture
    normalMap: Texture
    roughnessMap: Texture
    metallicMap: Texture
    heightMap: Texture
    aoMap: Texture
    emmisive: Texture

    constructor(tint: vec4) {
        this.tint = tint
        this.lighting = Lighting.BlinnPhong
    }  
}