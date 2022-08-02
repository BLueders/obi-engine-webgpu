import Model from "./model"
import OBI from "./obi"
import { PipelineLibrary } from "./pipeline-library"

export default class Renderer {

    model: Model

    pipeline: GPURenderPipeline
    materialBindGroup: GPUBindGroup
    modelMatrixBuffer: GPUBuffer
    invTransBuffer: GPUBuffer

    constructor(model: Model) {
        this.model = model
        this.pipeline = PipelineLibrary.getPipeline(model)

        this.createMaterialBindGroup()
        this.createMatrixBuffers()
    }

    createMatrixBuffers() {
        this.modelMatrixBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer Model 4x4 matrix',
            size: 4 * 4 * 4, // 4 x 4 x float32
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })

        this.invTransBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer Inverse Transpose 3x3 matrix',
            //TODO: WGSL cant do a 3 component vector as a uniform as part of a matrix (only single) in matrices there has to be 16 bytes per entry
            size: 4 * 4 * 4, // 3 x 3 x float32
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
    }

    createMaterialBindGroup() {
        // Create a sampler with linear filtering for smooth interpolation.
        const sampler = OBI.device.createSampler({
            addressModeU: 'repeat',
            addressModeV: 'repeat',
            magFilter: 'linear',
            minFilter: 'linear'
        })

        // create color buffer
        const colorBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer store rgba color',
            size: 4 * 4, // 4 * float32
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        OBI.device.queue.writeBuffer(colorBuffer, 0, this.model.material.tint as Float32Array)

        const entries = []
        entries.push({
            binding: 0, // the color buffer
            resource: {
                buffer: colorBuffer
            }
        })

        if (this.model.material.albedoMap) {
            entries.push({
                binding: 1, // the sampler
                resource: sampler
            })
            entries.push({
                binding: 2, // albedo texture
                resource: this.model.material.albedoMap.gpuTexture.createView()
            })
        }

        this.materialBindGroup = OBI.device.createBindGroup({

            label: 'Texture Group with Texture/Sampler',
            layout: this.pipeline.getBindGroupLayout(1),
            entries: entries
        })
    }
}