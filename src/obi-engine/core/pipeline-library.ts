import Model from "./model";
import OBI from "./obi";
import vertexShaderSrc from "../../shaders/standard-vert.wgsl"
import fragShaderSrc from "../../shaders/standard-frag.wgsl"
import { preprocessShader } from "./preprocessor";
import Material from "./material";
import Renderer from "./renderer";
import shadowShaderSrc from "../../shaders/shadowpass-vert.wgsl";
import simpleRedShaderSrc from "../../shaders/simple-red-frag.wgsl";

export class PipelineLibrary{
    static pipelineCache:Map<string, GPURenderPipeline> = new Map<string, GPURenderPipeline>()

    static getPipeline(model:Model, material:Material, renderer:Renderer){
        
        const specs = new PipelineSpecs(model, material, renderer)
        const hash = specs.getHash()
        
        if(this.pipelineCache.has(hash))
            return this.pipelineCache.get(hash)

        const pipeline = this.createPipelineWithSpecs(specs)
        this.pipelineCache.set(hash, pipeline)
        console.log("Created Pipeline for specs: " + specs.getHash())
        return pipeline
    }

    // no fragment shader needed in shadow pass
    static createShadowPipeline(){
        const shadowVert = preprocessShader(shadowShaderSrc, new Map<string, boolean>())
        return OBI.device.createRenderPipeline({
            label: 'Shadow Pipline',
            layout: 'auto',
            vertex: {
                module: OBI.device.createShaderModule({
                    code: shadowVert,
                }),
                entryPoint: 'main',
                buffers: [{
                    arrayStride: 11 * 4, 
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
            primitive: {
                topology: 'triangle-list',
                cullMode: 'back'
            }, 
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth32float',
            }
        } as GPURenderPipelineDescriptor)
    }

    static createPipelineWithSpecs(specs:PipelineSpecs):GPURenderPipeline{
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
                    arrayStride: 11 * 4, 
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
                cullMode: 'back'
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

    hasAlbedoMap:boolean
    hasNormalMap:boolean
    lighting:Lighting
    receivesShadows:boolean

    constructor(model:Model, material:Material, renderer:Renderer){
        this.hasAlbedoMap = Boolean(material.albedoMap).valueOf() 
        this.hasNormalMap = Boolean(material.normalMap).valueOf() 
        this.lighting = renderer.lighting
        this.receivesShadows = renderer.receivesShadows
    }

    getHash(){ // not really a hash value, but I think this works best in typescript
        return JSON.stringify(this)
    }

    getFlagMap(){
        const shaderFlags = new Map<string, boolean>()    
        shaderFlags.set("HAS_ALBEDO_MAP", this.hasAlbedoMap)
        shaderFlags.set("HAS_NORMAL_MAP", this.hasNormalMap)
        shaderFlags.set("BLINNPHONG_LIGHTING", this.lighting === Lighting.BlinnPhong)
        shaderFlags.set("RECEIVES_SHADOWS", this.receivesShadows)
        return shaderFlags
    }

    static getAllFlags(){
        return [
            "HAS_ALBEDO_MAP",
            "HAS_NORMAL_MAP",
            "BLINNPHONG_LIGHTING",
            "RECEIVES_SHADOWS"
        ]
    }
}

export enum Lighting{
    BlinnPhong,
    PBR,
    Unlit
}
