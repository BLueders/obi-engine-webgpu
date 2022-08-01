export default class OBI{

    static device: GPUDevice
    static format: GPUTextureFormat
    static context: GPUCanvasContext
    static canvasSize: {height: number, width: number}

    static async initWebGPU(canvas: HTMLCanvasElement, fullscreen:boolean = true):Promise<boolean>{
        if(!navigator.gpu) 
            throw new Error('this browser does not support webgpu')
    
        const adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance' // choose dedicated graphics cards if possible
        })
        if(!adapter)
            throw new Error("no GPU adpater found")
        
            OBI.device = await adapter?.requestDevice({
            requiredFeatures: ["texture-compression-bc"],
            requiredLimits: { 
                maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize    
            }
        })
    
        if(fullscreen){
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        OBI.canvasSize = {height:canvas.height, width: canvas.width}
    
        OBI.context = (canvas?.getContext("webgpu") as unknown) as GPUCanvasContext
        OBI.format = navigator.gpu.getPreferredCanvasFormat()
    
        OBI.context?.configure({
            device: OBI.device,
            format: OBI.format,
            alphaMode: "opaque"
        })
    
        return true
    }

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
                    arrayStride: 11 * 4, // 3 position
                    // arrayStride: 11 * 4, // 3 position 2 uv,
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

        return pipeline
    }
}


