import vertexShaderCode from "./shaders/positionColorVert.wgsl"
import fragmentShaderCode from "./shaders/positionColorFrag.wgsl"
import * as cube from "./obi-engine/utils/cube"
import { mat3, mat4, vec3 } from "gl-matrix";

// This will execute the setup function once the whole document has been loaded.
window.addEventListener("load",function(){
    setup()
});

async function setup(){
    console.log("setup...")
    const {device, format, context, size} = await initWebGPU()
    const {pipeline, vertexBuffer, mvpMatrixBuffer, colorBuffer, uniformGroup, depthTexture} = await initPipeline(device, format, size)

    run(device, context, pipeline, vertexBuffer, mvpMatrixBuffer, colorBuffer, uniformGroup, depthTexture)
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
    const size = {height:canvas.height, width: canvas.width}

    const context:GPUCanvasContext = (canvas?.getContext("webgpu") as unknown) as GPUCanvasContext
    const format = navigator.gpu.getPreferredCanvasFormat()

    context?.configure({
        device: device,
        format: format,
        alphaMode: "opaque"
    })

    return {device, format, context, size}
}

async function initPipeline(device:GPUDevice, format:GPUTextureFormat, size: {width:number, height:number}){
    const vertexShader = device.createShaderModule({
        code : vertexShaderCode
    })
    const fragmentShader = device.createShaderModule({
        code: fragmentShaderCode
    })

    const pipeline = await device.createRenderPipelineAsync({
        vertex:{
            module: vertexShader,
            entryPoint: "main",
            buffers: [{ // Buffer layout for position attribute in vertex shader
                arrayStride: 3 * 4, // = 3 float32
                attributes: [{
                    //position attribute (xyz)
                    shaderLocation : 0,
                    offset: 0,
                    format: 'float32x3'
                } as GPUVertexAttribute]
            } as GPUVertexBufferLayout]
        },
        fragment: {
            module: fragmentShader,
            entryPoint: "main",
            targets: [{format:format}]
        }, 
        primitive: {
            topology: "triangle-list"
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: "less-equal",
            format: "depth24plus" //24bit depth map
        },
        layout : "auto"
    } as GPURenderPipelineDescriptor)

    // depth map
    const depthTexture = device.createTexture({
        size, 
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    } as GPUTextureDescriptor)

    // position vertex buffer
    const vertexBuffer = device.createBuffer({
        label: 'vertex position GPUBuffer',
        size: cube.vertex.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })
    device.queue.writeBuffer(vertexBuffer, 0, cube.vertex)

    // color uniform data buffer
    const colorBuffer = device.createBuffer({
        label: "color uniform data GPUBuffer",
        size: 4 * 4, // = 4 float32
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    device.queue.writeBuffer(colorBuffer, 0, new Float32Array([1,1,0,1]))

    // MVP Matrix data buffer
    const mvpMatrixBuffer = device.createBuffer({
        label: "MVP uniform data GPUBuffer",
        size: 4*4*4, // 16 float 32 (4x4 matrix)
        usage:  GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    device.queue.writeBuffer(mvpMatrixBuffer, 0, mat4.identity(mat4.create()) as Float32Array)

    // create bind group for uniform data
    const uniformGroup = device.createBindGroup({
        label: 'Uniform Group for colorBuffer',
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: mvpMatrixBuffer
                }
            } as GPUBindGroupEntry,
            // {
            //     binding: 1,
            //     resource: {
            //        buffer: colorBuffer
            //     }
            // } as GPUBindGroupEntry
        ]
    } as GPUBindGroupDescriptor)

    return {pipeline, vertexBuffer, mvpMatrixBuffer, colorBuffer, uniformGroup, depthTexture}
}

function run(device: GPUDevice, 
    context:GPUCanvasContext,
    pipeline: GPURenderPipeline, 
    vertexBuffer: GPUBuffer,
    mvpMatrixBuffer : GPUBuffer,
    colorBuffer: GPUBuffer,
    uniformGroup: GPUBindGroup,
    depthTexture: GPUTexture){
    
    const aspect = (context.canvas as HTMLCanvasElement).width / (context.canvas as HTMLCanvasElement).height
    let rotation = 0
    setInterval(()=>{
        rotation += 0.01
        const MVP = createModelViewMatrix(aspect, rotation)
        device.queue.writeBuffer(mvpMatrixBuffer, 0, MVP as unknown as Float32Array)
        draw(device, context, pipeline, vertexBuffer, mvpMatrixBuffer, colorBuffer, uniformGroup, depthTexture)
    }, 20)
}

function draw(  device: GPUDevice, 
                context:GPUCanvasContext,
                pipeline: GPURenderPipeline, 
                vertexBuffer: GPUBuffer,
                mvpMatrixBuffer : GPUBuffer,
                colorBuffer: GPUBuffer,
                uniformGroup: GPUBindGroup,
                depthTexture: GPUTexture){
    // create encoder to record all commands and create buffer
    const encoder = device.createCommandEncoder()

    const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments:[{
            view: context.getCurrentTexture().createView(), // output to canvas
            loadOp: 'clear',
            clearValue: {r:0, g:0, b:0, a:1},
            storeOp: 'store'
        }],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store'
        }
    }
    const renderPass = encoder.beginRenderPass(renderPassDescriptor)

    renderPass.setPipeline(pipeline)
    renderPass.setBindGroup(0, uniformGroup)
    renderPass.setVertexBuffer(0, vertexBuffer)

    renderPass.draw(cube.vertexCount) // run vertex shader 3 times (draw 3 vertices)
    renderPass.end()
    const buffer = encoder.finish()
    device.queue.submit([buffer])
}

function createModelViewMatrix(ascpect:number, rotation:number){

    const pos = {x:0, y:0, z:-5}
    const rot = {x:rotation, y:rotation, z:0}
    const scale = {x:1, y:1, z:1}

    const modelviewMatrix = mat4.create()
    mat4.translate(modelviewMatrix, modelviewMatrix, vec3.fromValues(pos.x, pos.y, pos.z))
    
    mat4.rotateY(modelviewMatrix, modelviewMatrix, rot.y)
    mat4.rotateX(modelviewMatrix, modelviewMatrix, rot.x)
    mat4.rotateZ(modelviewMatrix, modelviewMatrix, rot.z)

    mat4.scale(modelviewMatrix, modelviewMatrix, vec3.fromValues(scale.x, scale.y, scale.z))

    const projectionMat = mat4.create()
    mat4.perspective(projectionMat, Math.PI / 2, ascpect, 0.1, 100)

    const MVP = mat4.create()
    mat4.mul(MVP, projectionMat, modelviewMatrix)
    return MVP
}
