import { mat3, mat4, quat, vec3, vec4 } from "gl-matrix";
import StandardMaterial from "./standard-material";
import Model from "./model";
import OBI from "./obi";
import Primitives from "./primitives";
import Scene from "./scene";
import { Transform } from "./transform";
import Shader from "./shader";

export enum LightType {
    Directional,
    Point,
    Spot
}

export class Light {
    transform: Transform
    type: LightType
    color: vec3
    range: number
    intensity: number
    innerSpotAngle: number
    outerSpotAngle: number
    castShadows: boolean
    shadowProjector: ShadowProjector

    constructor(type: LightType = LightType.Directional, position: vec3 = vec3.create(), rotation: quat = quat.create()) {
        this.type = type
        this.transform = new Transform(position, rotation)
        this.color = vec3.fromValues(0, 0, 0)
        this.range = 10
        this.intensity = 1
        this.castShadows = false
        this.innerSpotAngle = 0
        this.outerSpotAngle = 0
    }

    enableShadows(){
        this.castShadows = true
        this.shadowProjector = new ShadowProjector(this)
    }
}

export enum ShadowProjection {
    Perspective,
    Orthographic
}

class ShadowProjector {

    debugColorMap: GPUTexture

    shadowMap: GPUTexture
    shadowMapView: GPUTextureView
    lightMatrix: mat4
    projectionMatrix: mat4
    viewMatrix: mat4
    modelMatrix: mat4
    light: Light
    projection: ShadowProjection

    constructor(light: Light) {
        this.light = light

        this.lightMatrix = mat4.create()
        this.projectionMatrix = mat4.create()
        this.modelMatrix = mat4.create()
        this.viewMatrix = mat4.create()

        switch (light.type) {
            case LightType.Directional:
                this.shadowMap = OBI.device.createTexture({
                    size: [OBI.SHADOWMAP_RES, OBI.SHADOWMAP_RES, 1],
                    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
                    format: 'depth32float'
                });
                this.shadowMapView = this.shadowMap.createView()

                this.projection = ShadowProjection.Orthographic
                break
            default:
                throw new Error("Not Implemented")
                break
        } 
    }

    update(camPosition: vec3) {

        const forward = this.light.transform.localForward
        const lightTarget = vec3.create()

        vec3.normalize(forward, forward)
        vec3.scale(forward, forward, OBI.SHADOW_DISTANCE)
        //vec3.scale(lightPosition, inverseForward, OBI.SHADOW_DISTANCE)
        vec3.add(lightTarget, camPosition, forward)

        const up = forward[0] == 0 && forward[2] == 0 ? vec3.fromValues(1, 0, 0) : vec3.fromValues(0, 1, 0) // make sure up is valid

        mat4.lookAt(this.viewMatrix, camPosition, lightTarget, up)

        mat4.ortho(this.projectionMatrix,
            -OBI.SHADOW_DISTANCE, // left
            OBI.SHADOW_DISTANCE, // right
            -OBI.SHADOW_DISTANCE, // bottom
            OBI.SHADOW_DISTANCE, // top
            -OBI.SHADOW_DISTANCE * 2, // near   // near needs to add -distance because this makes a openGL ortho matrix where clip space z is [-1,1], not [0,1]
            OBI.SHADOW_DISTANCE  // far
        );


        mat4.identity(this.lightMatrix)
        mat4.mul(this.lightMatrix, this.projectionMatrix, this.viewMatrix)
    }
}