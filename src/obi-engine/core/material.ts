import { vec4 } from "gl-matrix"
import OBI from "./obi"
import Pipeline from "./pipeline"
import { Texture } from "./texture"

export default class Material {
    tint: vec4
    albedoMap: Texture
    normalMap: Texture
    roughnessMap: Texture
    metallicMap: Texture
    heightMap: Texture
    aoMap: Texture
    emmisive: Texture

    pipeline: Pipeline
    materialBindGroup: GPUBindGroup

    constructor(pipeline: Pipeline, tint: vec4) {
        this.tint = tint
        this.pipeline = pipeline
    }

    updateBindGroup(){
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
    OBI.device.queue.writeBuffer(colorBuffer, 0, this.tint as Float32Array)

    this.materialBindGroup = OBI.device.createBindGroup({

        label: 'Texture Group with Texture/Sampler',
        layout: this.pipeline.gpuPipeline.getBindGroupLayout(1),
        entries: [
            {
                binding: 0, // the color buffer
                resource: {
                    buffer: colorBuffer
                }
            },
            {
                binding: 1, // the sampler
                resource: sampler
            },
            {
                binding: 2, // albedo texture
                resource: this.albedoMap.gpuTexture.createView()
            }
        ]
    })
    }
}