import { Light } from "./light"
import OBI from "./obi"
import Shader from "./shader"

export default class StandardShader extends Shader{
    materialBindGroup: GPUBindGroup

    lightMatrixBuffer: GPUBuffer
    pointLightBuffer: GPUBuffer
    lightingBindGroup: GPUBindGroup

    constructor(hash: number, renderPipeline: GPURenderPipeline){
        super(hash, renderPipeline)
        this.pointLightBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer for lighting data',
            size: 3 * 4 * 4 * 3, // 3 * vec4<float32> * 3 point lights
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        this.lightMatrixBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer LightMatrix 4x4 matrix',
            size: 4 * 4 * 4, // 4 x 4 float32
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
    }
}