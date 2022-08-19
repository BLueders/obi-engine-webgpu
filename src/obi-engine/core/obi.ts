export default class OBI{

    static SHADOWMAP_RES: number = 2048
    static SHADOW_DISTANCE: number = 50

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

}


