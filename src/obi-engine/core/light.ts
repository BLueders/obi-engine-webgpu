import { mat3, mat4, quat, vec3, vec4 } from "gl-matrix";
import OBI from "./obi";
import { Transform } from "./transform";

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

    enableShadows() {
        this.castShadows = true
        switch(this.type){
            case LightType.Directional:
                this.shadowProjector = new DirectionalShadowProjector(this)
            break
            case LightType.Point:
                this.shadowProjector = new PointShadowProjector(this)
            break
            case LightType.Spot:
            break
        }
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

    constructor(light:Light){
        this.light = light

        this.lightMatrix = mat4.create()
        this.projectionMatrix = mat4.create()
        this.modelMatrix = mat4.create()
        this.viewMatrix = mat4.create()
    }

    update(camPosition: vec3) {
        throw new Error("Not implemented")
    }
}

class DirectionalShadowProjector extends ShadowProjector {

    constructor(light: Light) {
        super(light)

        this.shadowMap = OBI.device.createTexture({
            size: [OBI.SHADOWMAP_RES, OBI.SHADOWMAP_RES, 1],
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            format: 'depth32float'
        });
        this.shadowMapView = this.shadowMap.createView()

        this.projection = ShadowProjection.Orthographic
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

export class PointShadowProjector extends ShadowProjector {

    viewMatrixArray:mat4[]
    shadowMapRenderTargets: GPUTextureView[];

    constructor(light: Light) {
        super(light)
        const rez = OBI.SHADOWMAP_RES / 4
        this.shadowMap = OBI.device.createTexture({
            dimension: '2d',
            // Create a 2d array texture.
            // Assume each image has the same size.
            size: [rez, rez, 6],
            //format: 'depth32float',
            format: 'depth32float',
            usage:
            GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        });
        this.shadowMapView = this.shadowMap.createView({dimension: 'cube'})
        this.shadowMapRenderTargets = []
        for(let i = 0; i < 6; i++){
            this.shadowMapRenderTargets.push(this.shadowMap.createView({dimension: '2d', baseArrayLayer: i}))
        }

        this.projection = ShadowProjection.Perspective
        this.viewMatrixArray = []
        // 6 sides of the cube map => 6 view matrices
        this.viewMatrixArray.push(mat4.create())
        this.viewMatrixArray.push(mat4.create())
        this.viewMatrixArray.push(mat4.create())
        this.viewMatrixArray.push(mat4.create())
        this.viewMatrixArray.push(mat4.create())
        this.viewMatrixArray.push(mat4.create())
    }

    update(camPosition: vec3) {

        let target = vec3.create()
        let eye = this.light.transform.position

        //this.viewMatrix = mat4.lookAt(this.viewMatrixArray[0], eye, target, vec3.fromValues(0,-1, 0))

        //TODO: For some reason cubemap X coordinates are flipped?! This fixes it
        const scalingFixMat = mat4.create()
        mat4.fromScaling(scalingFixMat, vec3.fromValues(-1,1,1))

        //mat4.lookAt(this.viewMatrixArray[0], eye, vec3.add(target, eye, vec3.fromValues( 1, 0, 0)), vec3.fromValues(0, 1, 0))
        //Right +X
        vec3.add(target, eye, vec3.fromValues( 1, 0, 0))
        mat4.lookAt(this.viewMatrixArray[0], eye, target, vec3.fromValues(0, 1, 0))
        mat4.mul(this.viewMatrixArray[0], scalingFixMat, this.viewMatrixArray[0])

        //Left -X
        vec3.add(target, eye, vec3.fromValues(-1, 0, 0))
        mat4.lookAt(this.viewMatrixArray[1], eye, target, vec3.fromValues(0, 1, 0))
        mat4.mul(this.viewMatrixArray[1], scalingFixMat, this.viewMatrixArray[1])

        //UP +Y
        vec3.add(target, eye, vec3.fromValues( 0, 1, 0))
        mat4.lookAt(this.viewMatrixArray[2], eye, target, vec3.fromValues(0, 0,-1))
        mat4.mul(this.viewMatrixArray[2], scalingFixMat, this.viewMatrixArray[2])

        //Down -Y
        vec3.add(target, eye, vec3.fromValues( 0,-1, 0))
        mat4.lookAt(this.viewMatrixArray[3], eye, target, vec3.fromValues(0, 0, 1))
        mat4.mul(this.viewMatrixArray[3], scalingFixMat, this.viewMatrixArray[3])

        //Front +Z
        vec3.add(target, eye, vec3.fromValues( 0, 0, 1))
        mat4.lookAt(this.viewMatrixArray[4], eye, target, vec3.fromValues(0, 1, 0))
        mat4.mul(this.viewMatrixArray[4], scalingFixMat, this.viewMatrixArray[4])

        //Back -Z
        vec3.add(target, eye, vec3.fromValues( 0, 0,-1))
        mat4.lookAt(this.viewMatrixArray[5], eye, target, vec3.fromValues(0, 1, 0))
        mat4.mul(this.viewMatrixArray[5], scalingFixMat, this.viewMatrixArray[5])

        mat4.perspective(this.projectionMatrix, 90 * (Math.PI/180), 1, 0.1, this.light.range);
        //mat4.perspective(this.projectionMatrix, 90 * (Math.PI/180), 1, 1, 25);
    }
}