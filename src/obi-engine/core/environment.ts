import { mat4 } from "gl-matrix";
import OBI from "./obi";
import shaderSrc from "../../shaders/skybox.wgsl"
import { Camera } from "./camera";
import { CubeMapTexture } from "./texture";

export default class Environment {

    vertexCount: number;
    vertexBuffer: GPUBuffer;
    pipeline: GPURenderPipeline;

    viewBuffer: GPUBuffer
    projBuffer: GPUBuffer
    matrixBindGroup: GPUBindGroup;
    cubeMapBindGroup: GPUBindGroup;

    constructor(cubeMap: CubeMapTexture) {
        let vertices = [
            // 36 positions for cube covering all of clip space
            -1.0, 1.0, -1.0,
            -1.0, -1.0, -1.0,
            1.0, -1.0, -1.0,
            1.0, -1.0, -1.0,
            1.0, 1.0, -1.0,
            -1.0, 1.0, -1.0,

            -1.0, -1.0, 1.0,
            -1.0, -1.0, -1.0,
            -1.0, 1.0, -1.0,
            -1.0, 1.0, -1.0,
            -1.0, 1.0, 1.0,
            -1.0, -1.0, 1.0,

            1.0, -1.0, -1.0,
            1.0, -1.0, 1.0,
            1.0, 1.0, 1.0,
            1.0, 1.0, 1.0,
            1.0, 1.0, -1.0,
            1.0, -1.0, -1.0,

            -1.0, -1.0, 1.0,
            -1.0, 1.0, 1.0,
            1.0, 1.0, 1.0,
            1.0, 1.0, 1.0,
            1.0, -1.0, 1.0,
            -1.0, -1.0, 1.0,

            -1.0, 1.0, -1.0,
            1.0, 1.0, -1.0,
            1.0, 1.0, 1.0,
            1.0, 1.0, 1.0,
            -1.0, 1.0, 1.0,
            -1.0, 1.0, -1.0,

            -1.0, -1.0, -1.0,
            -1.0, -1.0, 1.0,
            1.0, -1.0, -1.0,
            1.0, -1.0, -1.0,
            -1.0, -1.0, 1.0,
            1.0, -1.0, 1.0
        ];

        this.vertexCount = vertices.length / 3 //How many vertices in the array

        const f32array = new Float32Array(vertices)

        this.vertexBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer store vertex',
            size: f32array.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        })
        OBI.device.queue.writeBuffer(this.vertexBuffer, 0, f32array)

        this.createPipeline()
        this.createBindGroups(cubeMap)
    }

    createBindGroups(cubeMap:CubeMapTexture){

        // uniform buffer
        this.viewBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer Environment View 4x4 matrix',
            size: 4 * 4 * 4, // 4 x 4 float32
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })

        this.projBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer Environment Projection 4x4 matrix',
            size: 4 * 4 * 4, // 4 x 4 float32
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })

        this.matrixBindGroup = OBI.device.createBindGroup({
            label: 'environment matrix bind group',
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0, // view matrix
                    resource: {
                        buffer: this.viewBuffer
                    }
                },
                {
                    binding: 1, // proj matrix
                    resource: {
                        buffer: this.projBuffer
                    }
                }
            ]
        })

        const sampler = OBI.device.createSampler({
            addressModeU: 'clamp-to-edge',
            addressModeV: 'clamp-to-edge',
            magFilter: 'linear',
            minFilter: 'linear'
        })

        this.cubeMapBindGroup = OBI.device.createBindGroup({

            label: 'Environment Texture Group with Texture/Sampler',
            layout: this.pipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 0, 
                    resource: sampler
                },
                {
                    binding: 1, 
                    resource: cubeMap.cubemapTexture.createView({
                        dimension: 'cube',
                    })
                }
            ]
        })
    }

    createPipeline() {
        this.pipeline = OBI.device.createRenderPipeline({
            label: 'Skybox Pipline',
            layout: 'auto',
            vertex: {
                module: OBI.device.createShaderModule({
                    code: shaderSrc,
                }),
                entryPoint: 'vert',
                buffers: [{
                    arrayStride: 3 * 4, // 3 position
                    attributes: [
                        {
                            // position
                            shaderLocation: 0,
                            offset: 0,
                            format: 'float32x3',
                        }
                    ]
                }]
            },
            fragment: {
                module: OBI.device.createShaderModule({
                    code: shaderSrc,
                }),
                entryPoint: 'frag',
                targets: [
                    {
                        format: OBI.format
                    }
                ]
            },
            primitive: {
                topology: 'triangle-list',
            },
            // Enable depth testing since we have z-level positions
            // Fragment closest to the camera is rendered in front
            depthStencil: {
                depthWriteEnabled: false,
                // depthCompare: 'less',
                format: 'depth24plus',
            }
        } as GPURenderPipelineDescriptor)


    }

    drawSkybox(encoder: GPURenderPassEncoder, camera: Camera) {

        let viewMatrix = mat4.clone(camera.viewMatrix);
        viewMatrix[12] = 0;
        viewMatrix[13] = 0;
        viewMatrix[14] = 0;

        encoder.setPipeline(this.pipeline)

        OBI.device.queue.writeBuffer(this.viewBuffer, 0, viewMatrix as Float32Array)
        OBI.device.queue.writeBuffer(this.projBuffer, 0, camera.projectionMatrix as Float32Array)

        encoder.setVertexBuffer(0, this.vertexBuffer)

        encoder.setBindGroup(0, this.matrixBindGroup)
        // set textureGroup
        encoder.setBindGroup(1, this.cubeMapBindGroup)

        encoder.draw(this.vertexCount)
    }
}