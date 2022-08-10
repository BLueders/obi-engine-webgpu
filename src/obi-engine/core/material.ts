import { vec4 } from "gl-matrix";
import Mesh from "./mesh";
import Shader from "./shader";
import { Lighting } from "./shader-library";
import Scene from "./scene";

export class Material{
    shader:Shader
    flags:Set<string>

    castShadows:boolean
    receivesShadows:boolean
    lighting:Lighting

    scene:Scene

    status: MaterialStatus

    texturesBindGroup: GPUBindGroup
    sceneBindGroup: GPUBindGroup

    constructor(){
        this.flags = new Set<string>()
        this.flags.add(Shader.BLINNPHONG_LIGHTING_FLAG)
        this.flags.add(Shader.RECEIVE_SHADOWS_FLAG)
        this.flags.add(Shader.CAST_SHADOWS_FLAG)
        this.status = MaterialStatus.NeedsUpdate
    }

    updateFlags(){
        this.setFlag(this.receivesShadows, Shader.RECEIVE_SHADOWS_FLAG)
        this.setFlag(this.castShadows, Shader.CAST_SHADOWS_FLAG)
        this.setFlag(this.lighting == Lighting.BlinnPhong, Shader.BLINNPHONG_LIGHTING_FLAG)
    }

    setFlag(value:boolean, flag:string){
        value ? this.flags.add(flag) : this.flags.delete(flag)
    }

    bindScene(scene:Scene){
        this.scene = scene
    }

    validate(){
        throw new Error("Cant validate base material")
    }
}

export enum MaterialStatus{
    NeedsUpdate,
    Valid,
    Invalid
}