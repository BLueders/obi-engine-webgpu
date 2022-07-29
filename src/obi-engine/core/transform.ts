import { mat3, mat4, quat, vec3, vec4 } from "gl-matrix"

export default class Transform{
  position: vec3
  rotation: quat
  scale: vec3
  modelMatrix: mat4

  /**
  * Creates an instance of Transform.
  * @param {Vector3} position the center of the model in world space.
  * @param {Vector3} rotation the rotation of the model (in degrees: x,y,z -> pitch,yaw,roll).
  * @param {Vector3} scale width, height and depth of the model (base is 1/1/1).
  */
  constructor(position?: vec3, rotation?: quat, scale?: vec3){

    if(position){ this.position = vec3.clone(position)}
    else {        this.position = vec3.create()}

    if(rotation){ this.rotation = quat.clone(rotation)}
    else {        this.rotation = quat.identity(quat.create())}

    if(scale){ this.scale = vec3.clone(scale)}
    else {     this.scale = vec3.fromValues(1,1,1)}

    // create and initialize Matrix
    this.modelMatrix = mat4.create()
    this.update()
  }

  // The base Vectors i,j and k of our 4x4 model matrix can be extracted to give us
  // the local right, upwards and forward direction of the model (its local X, Y and Z axis in the world).
  // This is useful to perform for example movement operations on the transform.
  get localRight(){ return vec3.fromValues(this.modelMatrix[0],this.modelMatrix[1],this.modelMatrix[2])}
  get localUp(){    return vec3.fromValues(this.modelMatrix[4],this.modelMatrix[5],this.modelMatrix[6])}
  get localForward(){    return vec3.fromValues(this.modelMatrix[8],this.modelMatrix[9],this.modelMatrix[10])}

	update(){
    mat4.fromRotationTranslationScale(this.modelMatrix, this.rotation, this.position, this.scale)
    return this
  }

  reset(){
    vec3.set(this.position, 0,0,0)
    vec3.set(this.scale, 1,1,1)
    quat.identity(this.rotation)
    mat4.identity(this.modelMatrix)
    return this
  }

}
