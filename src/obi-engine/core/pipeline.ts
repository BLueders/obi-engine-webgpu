import OBI from "./obi"

export default class Pipeline{

    gpuPipeline: GPURenderPipeline

    vertexUniformGroup: GPUBindGroup
    mvpBuffer: GPUBuffer
    invTansBuffer: GPUBuffer
    camPosBuffer: GPUBuffer

    static async createBasicPipeline(name: string, vertex: string, fragment: string) {
        const pipeline = await OBI.device.createRenderPipelineAsync({
            label: 'Basic Pipline: ' + name,
            layout: 'auto',
            vertex: {
                module: OBI.device.createShaderModule({
                    code: vertex,
                }),
                entryPoint: 'main',
                buffers: [{
                    arrayStride: 11 * 4, // 3 position 2 uv,
                    attributes: [
                        {
                            // position
                            shaderLocation: 0,
                            offset: 0,
                            format: 'float32x3',
                        },
                        {
                            // normal
                            shaderLocation: 1,
                            offset: 3 * 4,
                            format: 'float32x3',
                        },
                        {
                            // tangent
                            shaderLocation: 2,
                            offset: 6 * 4,
                            format: 'float32x3',
                        },
                        {
                            // uv
                            shaderLocation: 3,
                            offset: 9 * 4,
                            format: 'float32x2',
                        },
                    ]
                }]
            },
            fragment: {
                module: OBI.device.createShaderModule({
                    code: fragment,
                }),
                entryPoint: 'main',
                targets: [
                    {
                        format: OBI.format
                    }
                ]
            },
            primitive: {
                topology: 'triangle-list',
                // Culling backfaces pointing away from the camera
                // cullMode: 'back'
            },
            // Enable depth testing since we have z-level positions
            // Fragment closest to the camera is rendered in front
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus',
            }
        } as GPURenderPipelineDescriptor)

        const newPipeline = new Pipeline()

        newPipeline.mvpBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer Model, View and Projection 4x4 matrix',
            size: 4 * 4 * 4 * 3, // 4 x 4 x float32 * 3 matrices (MVP)
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })

        newPipeline.invTansBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer Inverse Transpose 3x3 matrix',
            //TODO: FIXME: WHY THE F** DO I HAVE TO PUT 3*4 FOR MINIMUM BINDING SIZE?!
            size: 3 * 4 * 4, // 3 x 3 x float32
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })

        newPipeline.camPosBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer store 4x4 matrix',
            size: 3 * 4, // 3 values
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })

        // create a uniform group contains matrix
        newPipeline.vertexUniformGroup = OBI.device.createBindGroup({
            label: 'Uniform Group with Matrix',
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: newPipeline.mvpBuffer
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: newPipeline.invTansBuffer
                    },
                },
                {
                    binding: 2,
                    resource: {
                        buffer: newPipeline.camPosBuffer
                    },
                }
            ]
        })

        newPipeline.gpuPipeline = pipeline
        return newPipeline
    }
}