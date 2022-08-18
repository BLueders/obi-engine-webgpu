"use strict";

import { glMatrix, mat4, quat, vec3 } from "gl-matrix";
import Input from "../utils/input";
import OBI from "./obi";
import Shader from "./shader";

/** A Perspective Camera to render 3D geometry
*/
export class Camera {
    aspectRatio: number;
    fov: number;
    near: number;
    far: number;
    cameraMatrix: mat4;
    viewMatrix: mat4;
    projectionMatrix: mat4;
    size: any;

    depthMap: GPUTexture
    depthMapView: GPUTextureView
    cameraUniformBuffer: GPUBuffer

    /** Creates a new PerspectiveCamera object
    * @param {number} fov the field of view of the camera, default 45 degrees.
    * @param {number} near distance to the near plane of the camera frustum, default 0.1.
    * @param {number} far distance to the far plane of the camera frustum, default 1000.
    * @param {number} aspectRatio aspect ratio of the target canvas/screen.
    */
    constructor(fov: number = 45.0, near: number =  0.1, far: number = 1000.0, aspectRatio: number = OBI.canvasSize.width / OBI.canvasSize.height){
        this.aspectRatio = aspectRatio
        this.fov = fov
        this.near = near
        this.far = far

        this.cameraMatrix = mat4.create();
        this.viewMatrix = mat4.create();
        this.projectionMatrix = mat4.create();
        this.perspProjectionMatrix(fov, near, far, aspectRatio);

        this.depthMap = OBI.device.createTexture({
            size: OBI.canvasSize, 
            format: 'depth24plus-stencil8',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        } as GPUTextureDescriptor)
        this.depthMapView = this.depthMap.createView()

        this.cameraUniformBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer Camera Data',
            size: 4 * 4 * 4 + // 4 x 4 float32 view matrix
                4 * 4 * 4 + // 4 x 4 float32 projection matrix
                3 * 4,      // 3 * float32 camera position
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
    }

    resize(){
        this.perspProjectionMatrix(this.fov, this.near, this.far, OBI.canvasSize.width / OBI.canvasSize.height);

        this.depthMap.destroy();
        this.depthMap = OBI.device.createTexture({
            size: OBI.canvasSize, 
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        } as GPUTextureDescriptor)
    }

    /** Sets the camera matrix to tranlate to "position" with the target orientation of "rotation".
    * @param {position} vec3 the new position of the camera.
    * @param {rotation} vec3 the new rotation of the camera.
    */
    setPositionRotation(position: vec3, rotation: quat){
        this.cameraMatrix = mat4.fromRotationTranslation(this. cameraMatrix, rotation, position);
        mat4.invert(this.viewMatrix, this.cameraMatrix);
    }

    /** Sets the camera matrix to tranlate to "position" with the new orientation,
    * that makes the camera look at "target" with the upwards orientation (roll) of "up".
    * @param {position} vec3 the new position of the camera.
    * @param {target} vec3 the target the camera should look at.
    * @param {up} vec3 the relative upwards direction of the camera.
    */
    lookAt(position: vec3, target: vec3, up: vec3){
        if(!up) up = vec3.fromValues(0,1,0);
        mat4.targetTo(this.cameraMatrix, position, target, up);
        mat4.invert(this.viewMatrix, this.cameraMatrix);
    }

    /** Updates the perspectie matrix of the camera with the new values
    * @param {number} fov the field of view of the camera, default 45 degrees.
    * @param {number} near distance to the near plane of the camera frustum, default 0.1.
    * @param {number} far distance to the far plane of the camera frustum, default 1000.
    * @param {number} aspectRatio aspect ratio of the target canvas/screen.
    */
    perspProjectionMatrix(fov: number, near: number, far: number, aspectRatio: number){
        // use new values if supplied, or old values if already present, or default values
        this.fov = fov; 
        this.near = near;
        this.far = far; 
        this.aspectRatio = aspectRatio;

        this.projectionMatrix = mat4.perspective(this.projectionMatrix, this.fov / 180 * Math.PI,  this.aspectRatio, this.near, this.far);
        return this.projectionMatrix;
    }

    /** Updates the perspectie matrix of the camera with the new values
    * @param {number} size height of the camera (orthographic size).
    * @param {number} near distance to the near plane of the camera frustum, default 0.1.
    * @param {number} far distance to the far plane of the camera frustum, default 1000.
    * @param {number} aspectRatio aspect ratio of the target canvas/screen.
    */
    orthoProjectionMatrix(size: number, near: number, far: number, aspectRatio: number){
    // use new values if supplied, or old values if already present, or default values
    this.size = size || this.size || 5;
    this.aspectRatio = aspectRatio || this.aspectRatio || 1920.0/1080.0;

    let left = -size * aspectRatio;
    let right = size * aspectRatio;

    this.near = near || this.near || 0.1;
    this.far = far || this.far || 1000.0;
    this.projectionMatrix = mat4.ortho(this.projectionMatrix, left, right, -this.size, this.size, this.near, this.far);
    return this.projectionMatrix;
}

    /** Gets the camera world position from the camera matrix.
    * @return {Vector3} the camera world position.
    */
    getPosition(){
        return vec3.fromValues(this.cameraMatrix[12],this.cameraMatrix[13],this.cameraMatrix[14]);
    }

    /** Gets the camera world view direction.
    * @return {Vector3} the camera world view direction.
    */
    getViewDir(){
        return vec3.fromValues(-this.cameraMatrix[8],-this.cameraMatrix[9],-this.cameraMatrix[10]);
    }
}

/** A Controller that will use mouse input to move a 3D camera around a set target.
*/
export class OrbiterCameraController {
    canvas: HTMLCanvasElement;
    camera: Camera;         // the camera to be controlled.
    target: vec3;         // the point the camera should orbit around.
    distance: number;       // distance of the camera to the target.
    zoomSpeed: number;      // speed to zoom in/out with the mousewheel
    rotationSpeed: number;  // speed to orbit around the target when moving the mouse.
    movementSpeed: number;  // speed to move up and down when holding "shift".
    pitch: number;          // current pitch of the camera.
    yaw: number;            // current yaw of the camera.
    offsetY: number;        // current height offset to the target of the camera.

    private position: vec3
    private rotation: quat
    private origin: vec3
    private up: vec3

    /** Creates a new OrbiterCameraController object
    * @param {Canvas} canvas the canvas the camera draws on.
    * @param {Camera} camera the camera to be controlled by this controller.
    * @param {vec3} target the point the camera should orbit around.
    * @param {number} distance distance of the camera to the target.
    * @param {number} zoomSpeed speed to zoom in/out with the mousewheel
    * @param {number} rotationSpeed speed to orbit around the target when moving the mouse.
    * @param {number} movementSpeed speed to move up and down when holding "shift".
    * @param {number} startingPitch pitch of the camera when starting.
    * @param {number} tartingYaw yaw of the camera when starting.
    */
    constructor(canvas: HTMLCanvasElement, camera: Camera, target?: vec3, distance?: number, zoomSpeed?: number, rotationSpeed?: number, movementSpeed?: number, startingPitch?: number, tartingYaw?: number){
        this.canvas = canvas;
        this.camera = camera;
        this.target = target || vec3.create();
        this.distance = distance || 5;
        this.zoomSpeed = zoomSpeed || 500;
        this.rotationSpeed = rotationSpeed || 200;
        this.movementSpeed = movementSpeed || 10;
        this.pitch = startingPitch || -25
        this.yaw = tartingYaw || 0;
        this.offsetY = 0;
        this.position = vec3.fromValues(0,0,distance);
        this.rotation = quat.identity(quat.create());
        this.origin = vec3.create();
        this.up = vec3.fromValues(0,1,0);
    }

    /** Updates the controller and the camera matrix of the controlled camera.
    * Call during update phase.
    */
    update(){
        if(Input.mouseButtonHold(0)){
            this.yaw += Input.mousePositionDelta[0] * (this.rotationSpeed / this.canvas.height);    // make rotationspeed the same, no matter the height.
            // move up and down when shift is pressed, else
            if(Input.keyHold("shift")){
                this.offsetY += Input.mousePositionDelta[1] * (this.movementSpeed / this.canvas.height);
            } else {
                this.pitch += Input.mousePositionDelta[1] * (this.rotationSpeed / this.canvas.height);
            }
        }
        this.distance += Input.mouseWheelDelta * (this.zoomSpeed / this.canvas.height) * (this.distance/3);

        vec3.set(this.position, 0, 0, 1);
        vec3.rotateX(this.position, this.position, this.origin, glMatrix.toRadian(this.pitch));
        vec3.rotateY(this.position, this.position, this.origin, glMatrix.toRadian(this.yaw));

        vec3.scale(this.position, this.position, this.distance);
        vec3.add(this.position, this.position, this.target);


        this.camera.lookAt(this.position, this.target, this.up);
    }
}
