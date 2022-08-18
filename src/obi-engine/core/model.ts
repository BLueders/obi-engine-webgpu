import { mat3, mat4, quat, vec3 } from "gl-matrix"
import StandardMaterial from "./standard-material"
import Mesh from "./mesh"
import { Transform } from "./transform"
import OBI from "./obi"
import Shader from "./shader"
import { Light } from "./light"
import { Lighting } from "./shader-library"

export default class Model {
    mesh: Mesh
    material: StandardMaterial
    transform: Transform

    modelUniformBuffer: GPUBuffer
    modelBindGroup: GPUBindGroup
    shadowPassBindGroup: GPUBindGroup

    constructor(mesh: Mesh, material: StandardMaterial, position?: vec3, rotation?: quat, scale?: vec3) {
        this.mesh = mesh
        this.material = material

        this.transform = new Transform(position, rotation, scale)

        this.modelUniformBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer Model 4x4 matrix',
            size: 4 * 4 * 4 + // 4 x 4 x float32 model matrix
                4 * 4 * 4 + // 4 x 4 x float32 inv trans matrix (stride has to be min 4xfloat32)
                4 * 4 * 4, // 4 x 4 x float32 model view projection matrix
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
    }

    prepareBindGroups() {

        const modelBindGroupEntries = [{
            binding: 0, // model data
            resource: {
                buffer: this.modelUniformBuffer
            }
        }]
        const modelBindGroupLayoutEntries = [Shader.DEFAULT_MODEL_BINDGROUPLAYOUTENTRY]
        const modelBindGroupLayout = OBI.device.createBindGroupLayout({ entries: modelBindGroupLayoutEntries })

        this.modelBindGroup = OBI.device.createBindGroup({
            label: 'model bind group',
            layout: modelBindGroupLayout,
            entries: modelBindGroupEntries
        })

        this.shadowPassBindGroup = OBI.device.createBindGroup({
            label: 'shadow pass model bind group',
            layout: OBI.device.createBindGroupLayout({ entries: [Shader.DEFAULT_MODEL_BINDGROUPLAYOUTENTRY] }),
            entries: [{
                binding: 0, // model data
                resource: {
                    buffer: this.modelUniformBuffer
                }
            }]
        })
    }

    // updatePointLightBuffer(lights: Light[]) {
    //     if (this.material.lighting === Lighting.Unlit)
    //         return
    //     if (lights.length >= 3) { // if less than 4 point lights, no sorting required
    //         const pointLightSortingFunction = (lightA: Light, lightB: Light) => {
    //             const distA = vec3.sqrDist(this.transform.position, lightA.transform.position)
    //             const distB = vec3.sqrDist(this.transform.position, lightB.transform.position)
    //             if (distA < distB) {
    //                 return -1;
    //             }
    //             if (distA > distB) {
    //                 return 1;
    //             }
    //             return 0;
    //         }
    //         lights.sort(pointLightSortingFunction)
    //     }

    //     const lightData = new Float32Array(3 * 3 * 4) // 3 point lights with 3 vec4
    //     lightData.fill(0)
    //     for (let i = 0; i < lights.length && i < 3; i++) {
    //         lightData.set(lights[i].transform.position, i * 12)
    //         lightData.set(lights[i].color, i * 12 + 4)
    //         lightData[i * 12 + 8] = lights[i].range
    //         lightData[i * 12 + 9] = lights[i].intensity
    //     }

    //     OBI.device.queue.writeBuffer(this.pointLightUniformBuffer, 0, lightData)
    // }
}
