import { vec4 } from "gl-matrix"
import { Lighting } from "./pipeline-library"
import { Texture } from "./texture"

export default class Material {

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
    }  
}