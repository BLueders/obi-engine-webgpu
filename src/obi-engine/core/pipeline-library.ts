import Material from "./material";
import Model from "./model";
import OBI from "./obi";
import vertexShaderSrc from "../../shaders/standard-vert.wgsl"
import fragShaderSrc from "../../shaders/standard-frag.wgsl"
import textureUnlitShaderSrc from "../../shaders/textured-unlit-frag.wgsl"
import { preprocessShader } from "./preprocessor";

export class PipelineLibrary{
    static pipelineCache:Map<string, GPURenderPipeline> = new Map<string, GPURenderPipeline>()

    static getPipeline(model:Model){
        
        const specs = new PipelineSpecs(model)
        const hash = specs.getHash()
        
        if(this.pipelineCache.has(hash))
            return this.pipelineCache.get(hash)

        const pipeline = this.makePipelineWithSpecs(specs)
        this.pipelineCache.set(hash, pipeline)
        console.log("Created Pipeline for specs: " + specs.getHash())
        return pipeline
    }

    static makePipelineWithSpecs(specs:PipelineSpecs):GPURenderPipeline{
        let label = ""
        let vert = vertexShaderSrc
        let frag = fragShaderSrc
        
        const shaderFlags = specs.getFlagMap()
        vert = preprocessShader(vert, shaderFlags)
        frag = preprocessShader(frag, shaderFlags)

        return PipelineLibrary.createBasicPipeline(label + "Base", vert, frag)
    }

    static createBasicPipeline(name: string, vertex: string, fragment: string) {
        const pipeline = OBI.device.createRenderPipeline({
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

export class PipelineSpecs{

    hasAlbedo:boolean
    lighting:Lighting

    constructor(model:Model){
        this.hasAlbedo = Boolean(model.material.albedoMap).valueOf() 
        this.lighting = model.material.lighting
    }

    getHash(){ // not really a hash value, but I think this works best in typescript
        return JSON.stringify(this)
    }

    getFlagMap(){
        const shaderFlags = new Map<string, boolean>()    
        shaderFlags.set("HAS_ALBEDO", this.hasAlbedo)
        shaderFlags.set("BLINNPHONG_LIGHTING", this.lighting === Lighting.BlinnPhong)
        return shaderFlags
    }
}

export enum Lighting{
    BlinnPhong,
    PBR,
    Unlit
}
