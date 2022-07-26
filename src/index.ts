import vertexShaderCode from "./shaders/triangleVert.wgsl"
import fragmentShaderCode from "./shaders/simpleRedFrag.wgsl"

// This will execute the setup function once the whole document has been loaded.
window.addEventListener("load",function(){
    setup()
});

async function setup(){
    console.log("setup...")
    const {device, format, context} = await initWebGPU()
    const pipeline = await initPipeline(device, format)
    draw(device, pipeline, context)
}

async function initWebGPU(){
    if(!navigator.gpu) 
        throw new Error('this browser does not support webgpu')

    const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance' // choose dedicated graphics cards if possible
    })
    if(!adapter)
        throw new Error("no GPU adpater found")
    
    const device = await adapter?.requestDevice({
        requiredFeatures: ["texture-compression-bc"],
        requiredLimits: { 
            maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize    
        }
    })

    const canvas = document.querySelector("canvas")
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const context:GPUCanvasContext = (canvas?.getContext("webgpu") as unknown) as GPUCanvasContext
    const format = navigator.gpu.getPreferredCanvasFormat()

    context?.configure({
        device: device,
        format: format,
        alphaMode: "opaque"
    })

    return {device, format, context}
}

async function initPipeline(device:GPUDevice, format:GPUTextureFormat){
    const vertexShader = device.createShaderModule({
        code : vertexShaderCode
    })
    const fragmentShader = device.createShaderModule({
        code: fragmentShaderCode
    })

    const pipeline = await device.createRenderPipelineAsync({
        vertex:{
            module: vertexShader,
            entryPoint: "main"
        },
        fragment: {
            module: fragmentShader,
            entryPoint: "main",
            targets: [{format:format}]
        }, 
        primitive: {
            topology: "triangle-list"
        },
        layout : "auto"
    })
    return pipeline
}

function draw(device: GPUDevice, pipeline: GPURenderPipeline, context:GPUCanvasContext){
    // create encoder to record all commands and create buffer
    const encoder = device.createCommandEncoder()
    const renderPass = encoder.beginRenderPass({
        colorAttachments:[{
            view: context.getCurrentTexture().createView(), // output to canvas
            loadOp: 'clear',
            clearValue: {r:0, g:0, b:0, a:1},
            storeOp: 'store'
        }]
    })
    renderPass.setPipeline(pipeline)
    renderPass.draw(3) // run vertex shader 3 times (draw 3 vertices)
    renderPass.end()
    const buffer = encoder.finish()
    device.queue.submit([buffer])
}
