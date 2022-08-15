import { vec4 } from "gl-matrix";
import Mesh from "./mesh";
import Shader from "./shader";
import { Lighting } from "./shader-library";
import Scene from "./scene";
import { Uniform } from "./uniform";

export class Material{
    shader:Shader
    flags:Set<string>

    castShadows:boolean
    receivesShadows:boolean
    lighting:Lighting

    scene:Scene

    status: MaterialStatus

    uniforms: Map<number, Map<number, Uniform>>
    uniformLayouts: Map<number, GPUBindGroupLayout>
    uniformBindGroups: Map<number, GPUBindGroup>
    
    sceneBindGroup: GPUBindGroup

    constructor(){
        this.flags = new Set<string>()
        this.uniforms = new Map<number, Map<number, Uniform>>()
        this.uniformLayouts = new Map<number, GPUBindGroupLayout>()
        this.uniformBindGroups = new Map<number, GPUBindGroup>()
        this.flags.add(Shader.CAST_SHADOWS_FLAG)
        this.status = MaterialStatus.NeedsUpdate
    }

    updateFlags(){
        this.setFlag(this.receivesShadows, Shader.RECEIVE_SHADOWS_FLAG)
        this.setFlag(this.castShadows, Shader.CAST_SHADOWS_FLAG)
        this.setFlag(this.lighting == Lighting.BlinnPhong, Shader.BLINNPHONG_LIGHTING_FLAG)

        // sort to avoid hash dublicates when making shader
        // TODO fix hash to not depend on order in set
        const sortedArray = Array.from(this.flags).sort()
        this.flags.clear()
        sortedArray.forEach(value => this.flags.add(value))
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