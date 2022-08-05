import { mat4, quat, vec3 } from "gl-matrix";
import OBI from "./obi";
import Scene from "./scene";
import { Transform } from "./transform";

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
    castShadows: boolean
    shadowProjector: ShadowProjector

    constructor(type: LightType = LightType.Directional, position:vec3 = vec3.create(), rotation:quat = quat.create()){
        this.type = type
        this.transform = new Transform(position, rotation)
        this.color = vec3.fromValues(0,0,0)
        this.range = 10
        this.intensity = 1
        this.castShadows = true  
        this.shadowProjector = new ShadowProjector(this)
    }
}

export enum ShadowProjection{
    Perspective,
    Orthographic
}

class ShadowProjector{

    debugColorMap: GPUTexture

    shadowMap: GPUTexture
    shadowMapView: GPUTextureView
    lightMatrix: mat4
    projectionMatrix: mat4
    viewMatrix: mat4
    modelMatrix: mat4
    light: Light
    projection: ShadowProjection

    viewBuffer: GPUBuffer
    projBuffer: GPUBuffer
    lightMatrixBuffer: GPUBuffer

    constructor(light: Light){
        this.light = light

        this.lightMatrix = mat4.create()
        this.projectionMatrix = mat4.create()
        this.modelMatrix = mat4.create()
        this.viewMatrix = mat4.create()

        switch(light.type){
            case LightType.Directional:
                this.shadowMap = OBI.device.createTexture({
                    size: [OBI.SHADOWMAP_RES, OBI.SHADOWMAP_RES, 1],
                    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
                    format: 'depth32float'
                });
                this.shadowMapView = this.shadowMap.createView()
        
                this.lightMatrixBuffer = OBI.device.createBuffer({
                    label: 'GPUBuffer LightMatrix 4x4 matrix',
                    size: 4 * 4 * 4, // 4 x 4 float32
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                }) 
                this.projection = ShadowProjection.Orthographic
                break
            default:
                throw new Error("Not Implemented")
                break
        }  

        this.viewBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer Light View 4x4 matrix',
            size: 4 * 4 * 4, // 4 x 4 float32
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })

        this.projBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer Light Projection 4x4 matrix',
            size: 4 * 4 * 4, // 4 x 4 float32
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })

        this.lightMatrixBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer M Lightmatrix 4x4 matrix',
            size: 4 * 4 * 4, // 4 x 4 float32
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })

        this.debugColorMap = OBI.device.createTexture({
            size: [OBI.SHADOWMAP_RES, OBI.SHADOWMAP_RES, 1],
            format: 'rgba8unorm',   // default RGBA
            usage:
                GPUTextureUsage.TEXTURE_BINDING |   // can be bound by groups
                GPUTextureUsage.COPY_DST |          // can be written to by JS to update
                GPUTextureUsage.RENDER_ATTACHMENT   // can be used as attachment to render pass
        })
    }

    update(scene:Scene){
        // const target = vec3.create()
        const camPosition = scene.mainCamera.getPosition()
        const forward = this.light.transform.localForward
        const inverseForward = vec3.fromValues(-forward[0],-forward[1],-forward[2])

        const lightPosition = vec3.create()
        vec3.scale(lightPosition, inverseForward, OBI.SHADOW_DISTANCE)
        //vec3.add(lightPosition, lightPosition, camPosition)

        const up = forward[0] == 0 && forward[2] == 0 ? vec3.fromValues(1,0,0) : vec3.fromValues(0,1,0) // make sure up is valid

        mat4.targetTo(this.modelMatrix, lightPosition, vec3.create(), up)
        //mat4.targetTo(this.modelMatrix, lightPosition, camPosition, up)
        mat4.invert(this.viewMatrix, this.modelMatrix)     
        
        mat4.ortho(this.projectionMatrix,
            -OBI.SHADOW_DISTANCE, // left
            OBI.SHADOW_DISTANCE, // right
            -OBI.SHADOW_DISTANCE, // bottom
            OBI.SHADOW_DISTANCE, // top
            -OBI.SHADOW_DISTANCE, // near
            OBI.SHADOW_DISTANCE*2  // far
            );

        mat4.identity(this.lightMatrix)
        mat4.mul(this.lightMatrix, this.projectionMatrix, this.viewMatrix)

        // vec3.add(target, position, forward)
        // mat4.targetTo(this.modelMatrix, position, target, up)
               
        // mat4.invert(this.viewMatrix, this.modelMatrix)

        // switch(this.projection){
        //     case ShadowProjection.Orthographic:
        //         mat4.ortho(this.projectionMatrix,
        //             -OBI.SHADOW_DISTANCE, // left
        //              OBI.SHADOW_DISTANCE, // right
        //             -OBI.SHADOW_DISTANCE, // bottom
        //              OBI.SHADOW_DISTANCE, // top
        //             -OBI.SHADOW_DISTANCE, // near
        //              OBI.SHADOW_DISTANCE  // far
        //              );
        //         break;
        //     case ShadowProjection.Perspective:
        //         throw new Error("Not implemented")
        //         break;
        // }

        // match lightMatrix to view frustum coordinates
        // mat4.fromTranslation(this.lightMatrix, vec3.fromValues(0.5, 0.5, 0.5));
        // mat4.scale(this.lightMatrix, this.lightMatrix, vec3.fromValues(0.5,-0.5,0.5));
        // mat4.mul(this.lightMatrix, this.projectionMatrix, this.viewMatrix);

        // const lightPosition = vec3.fromValues(50, 100, -100);
        // const upVector = vec3.fromValues(0,1,0)
        // //const upVector = forward[0] == 0 && forward[2] == 0 ? vec3.fromValues(1,0,0) : vec3.fromValues(0,1,0) // make sure up is valid
        // const origin = vec3.fromValues(0, 0, 0)

        // mat4.lookAt(this.viewMatrix, lightPosition, origin, upVector);

        // mat4.ortho(this.projectionMatrix,
        //         -80,80,-80,80,-200,300
        //         );
        
        // mat4.multiply(this.lightMatrix, this.projectionMatrix, this.viewMatrix);
    }
}