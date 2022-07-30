import { mat3, mat4, quat, vec3 } from "gl-matrix"
import Material from "./material"
import Mesh from "./mesh"
import Transform from "./transform"

export default class Model{
    mesh: Mesh
    material: Material
    transform: Transform

    /**
    * Creates an instance of ModelTransform.
    * @param {Mesh} mesh the mesh data of this model, eg. vertices, positions, etc.
    * @param {Material} material material data for this model, eg. color and textures.
    * @param {Vector3} position the center of the model in world space.
    * @param {Vector3} rotation the rotation of the model (in degrees: x,y,z -> pitch,yaw,roll).
    * @param {Vector3} scale width, height and depth of the model (base is 1/1/1).
    */
    constructor(mesh: Mesh, material: Material, position?: vec3, rotation?: quat, scale?: vec3){

        this.mesh = mesh
        this.material = material

        this.transform = new Transform(position, rotation, scale)
	}

    //...................................................
	//Methods
    //...................................................
    update():Model{
        this.transform.update()
        return this
    }
}
