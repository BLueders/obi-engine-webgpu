import OBI from "./obi"
import Scene from "./scene"
import Shader from "./shader"

export default class ShadowPassShader extends Shader{
    
    lightCameraBuffer: GPUBuffer

    shadowpassMatrixBindGroup: GPUBindGroup
    shadowPassBindGroup: GPUBindGroup

    constructor(hash: number, renderPipeline: GPURenderPipeline){
        super(hash, renderPipeline)

        this.lightCameraBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer Light View and Projection 4x4 matrix',
            size: 4 * 4 * 4 + // 4 x 4 float32 view matrix
                4 * 4 * 4 + // 4 x 4 float32 projection matrix
                3 * 4,      // 3 * float32 camera position
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
    }

    bindScene(scene:Scene){
        const entries = [{
            binding: 0, // model data
            resource: {
                buffer: this.modelBuffer
            }
        }, {
            binding: 1, // scene data
            resource: {
                buffer: this.lightCameraBuffer
            }
        }]

        this.shadowpassMatrixBindGroup = OBI.device.createBindGroup({
            label: 'shadow matrix bind group',
            layout: scene.shadowShader.renderPipeline.getBindGroupLayout(0),
            entries: entries
        })
    }
}