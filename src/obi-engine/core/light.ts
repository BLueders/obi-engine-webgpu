import { quat, vec3 } from "gl-matrix";
import Transform from "./transform";

export enum LightType{
    Directional,
    Point,
    Spot
}

export class Light{
    transform: Transform
    type: LightType
    color: vec3
    range: number
    intensity: number

    constructor(type: LightType = LightType.Directional, position:vec3 = vec3.create(), rotation:quat = quat.create()){
        this.type = type
        this.transform = new Transform(position, rotation)
        this.color = vec3.fromValues(0,0,0)
        this.range = 10
        this.intensity = 1
    }
}