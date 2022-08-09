import { mat3, mat4, quat, vec3, vec4 } from "gl-matrix"
import OBI from "./obi"

export class Transform {
    position: vec3
    rotation: quat
    scale: vec3
    modelMatrix: mat4
    normalMatrix: mat4

    private children: Set<Transform>
    private parent: Transform

    constructor(position?: vec3, rotation?: quat, scale?: vec3) {

        if (position) { this.position = vec3.clone(position) }
        else { this.position = vec3.create() }

        if (rotation) { this.rotation = quat.clone(rotation) }
        else { this.rotation = quat.identity(quat.create()) }

        if (scale) { this.scale = vec3.clone(scale) }
        else { this.scale = vec3.fromValues(1, 1, 1) }

        this.children = new Set<Transform>()

        // create and initialize Matrix
        this.modelMatrix = mat4.create()
        this.normalMatrix = mat4.create()
        this.update(mat4.identity(mat4.create()))
    }

    // The base Vectors i,j and k of our 4x4 model matrix can be extracted to give us
    // the local right, upwards and forward direction of the model (its local X, Y and Z axis in the world).
    // This is useful to perform for example movement operations on the transform.
    get localRight() { return vec3.fromValues(this.modelMatrix[0], this.modelMatrix[1], this.modelMatrix[2]) }
    get localUp() { return vec3.fromValues(this.modelMatrix[4], this.modelMatrix[5], this.modelMatrix[6]) }
    get localForward() { return vec3.fromValues(this.modelMatrix[8], this.modelMatrix[9], this.modelMatrix[10]) }

    get globalPosition() {return vec3.transformMat4(vec3.create(), this.position, this.modelMatrix)}

    update(parentMatrix:mat4) {
        mat4.fromRotationTranslationScale(this.modelMatrix, this.rotation, this.position, this.scale)
        mat4.mul(this.modelMatrix, parentMatrix, this.modelMatrix)
        mat4.invert(this.normalMatrix, this.modelMatrix)
        mat4.transpose(this.normalMatrix, this.normalMatrix)
        this.children.forEach(child => child.update(this.modelMatrix))
        return this
    }

    reset() {
        vec3.set(this.position, 0, 0, 0)
        vec3.set(this.scale, 1, 1, 1)
        quat.identity(this.rotation)
        mat4.identity(this.modelMatrix)
        return this
    }

    setParent(parent:Transform){
        if(this.parent){
            this.parent.children.delete(this)
        }
        this.parent = parent
        parent.children.add(this)
    }

    getParent(){
        return this.parent
    }

    addChild(child:Transform){
        if(child.parent){
            child.parent.children.delete(child)
        }
        child.parent = this
        this.children.add(child)
    }

    makeRoot(){
        let root = this.parent
        while(!(root instanceof SceneGraph)){
            if(root === undefined)
                throw new Error("transform has to be part of a scene to root")
            root = root.parent
        }
        this.parent = root
    }
}

export class SceneGraph extends Transform{
    constructor(){
        super()
    }

    updateGraph()  {
        this.update(mat4.identity(mat4.create()))
    }
}
