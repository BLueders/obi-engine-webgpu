import OBI from "./obi";
import standardVertexShaderSrc from "../../shaders/standard-vert.wgsl"
import standardFragShaderSrc from "../../shaders/standard-frag.wgsl"
import ambientOnlyVertShaderSrc from "../../shaders/ambient-only-vert.wgsl"
import ambientOnlyFragShaderSrc from "../../shaders/ambient-only-frag.wgsl"
import { preprocessShader } from "./preprocessor";
import shadowVertShaderSrc from "../../shaders/shadowpass-vert.wgsl";
import shadowCustomDepthFragSrc from "../../shaders/shadowpass-custom-depth-frag.wgsl";
import simpleRedShaderSrc from "../../shaders/simple-red-frag.wgsl";
import Shader from "./shader";
import { stringHash } from "../utils/utils";
import { LightType } from "./light";

export class ShaderLibrary {

    static shaderCache: Map<number, Shader> = new Map<number, Shader>()

    static getZ_OnlyPassShader(): Shader {
        const label = "OBI Z-only pass Shader"
        const hash = stringHash(label)

        if (this.shaderCache.has(hash))
            return this.shaderCache.get(hash)

        const depthStencil = {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus-stencil8',
            stencilFront: {
                passOp: 'increment-clamp'
            }
        } as GPUDepthStencilState

        const emtpyFlags = new Set<string>()

        const modelBindGroupLayout = OBI.device.createBindGroupLayout({ entries: Shader.getStandardModelBindGroupEntries(emtpyFlags) })
        const sceneBindGroupLayout = OBI.device.createBindGroupLayout({ entries: Shader.getStandardSceneBindGroupEntries(emtpyFlags) })

        const renderPipeline = this.createPipelineWithFlags(label, emtpyFlags, shadowVertShaderSrc, undefined, depthStencil, [modelBindGroupLayout, sceneBindGroupLayout])
        console.log("Created Z-only pass Shader")

        const shader = new Shader(hash, renderPipeline)
        this.shaderCache.set(hash, shader)
        return shader
    }

    static getBasePassShader(flags: Set<string>, materialBindGroupLayouts: Map<number, GPUBindGroupLayout>): Shader {
        const label = "OBI Base Pass Shader "
        const shader = ShaderLibrary.createShaderVariantWithFlags(label, flags, materialBindGroupLayouts)
        console.log("Created Base Pass variant for: " + Array.from(flags.values()))
        return shader
    }

    static getAmbientOnlyPassShader(flags: Set<string>, materialBindGroupLayouts: Map<number, GPUBindGroupLayout>): Shader {
        const label = "OBI Ambient Light Pre Pass Shader "
        const flagsCopy = new Set<string>(flags)
        flagsCopy.add(Shader.AMBIENT_LIGHT_PASS)

        const depthStencil = {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus-stencil8',
            stencilFront: {
                passOp: 'increment-clamp'
            }
        } as GPUDepthStencilState

        const targets = [{
                format: OBI.format
            } as GPUColorTargetState]

        const shader = ShaderLibrary.createShaderVariantWithFlags(label, flagsCopy, materialBindGroupLayouts, depthStencil, targets,
            ambientOnlyVertShaderSrc, ambientOnlyFragShaderSrc)
        console.log("Created Ambient Light Pass variant for: " + Array.from(flagsCopy.values()))
        return shader
    }

    static getAdditiveDirLightShader(flags: Set<string>, materialBindGroupLayouts: Map<number, GPUBindGroupLayout>): Shader {
        const label = "OBI Directional Light Pass Shader "
        const flagsCopy = new Set<string>(flags)
        flagsCopy.add(Shader.DIRECTIONAL_LIGHT_PASS)
        const targets = Shader.getAdditiveLightingColorTargets()
        const shader = ShaderLibrary.createShaderVariantWithFlags(label, flagsCopy, materialBindGroupLayouts, Shader.ADDITIVELIGHT_DEPTHSTENCIL_STATE, targets)
        console.log("Created Directional Light Pass variant for: " + Array.from(flagsCopy.values()))
        return shader
    }

    static getAdditivePointLightShader(flags: Set<string>, materialBindGroupLayouts: Map<number, GPUBindGroupLayout>): Shader {
        const label = "OBI Point Light Pass Shader "
        const flagsCopy = new Set<string>(flags)
        flagsCopy.add(Shader.POINT_LIGHT_PASS)
        const targets = Shader.getAdditiveLightingColorTargets()
        const shader = ShaderLibrary.createShaderVariantWithFlags(label, flagsCopy, materialBindGroupLayouts, Shader.ADDITIVELIGHT_DEPTHSTENCIL_STATE, targets)
        console.log("Created Point Light Pass variant for: " + Array.from(flagsCopy.values()))
        return shader
    }

    static getAdditiveSpotLightShader(flags: Set<string>, materialBindGroupLayouts: Map<number, GPUBindGroupLayout>): Shader {
        const label = "OBI Spot Light Pass Shader "
        const flagsCopy = new Set<string>(flags)
        flagsCopy.add(Shader.SPOT_LIGHT_PASS)
        const targets = Shader.getAdditiveLightingColorTargets()
        const shader = ShaderLibrary.createShaderVariantWithFlags(label, flagsCopy, materialBindGroupLayouts, Shader.ADDITIVELIGHT_DEPTHSTENCIL_STATE, targets)
        console.log("Created Spot Light Pass variant for: " + Array.from(flagsCopy.values()))
        return shader
    }

    static createShaderVariantWithFlags(label: string, flags: Set<string>, materialBindGroupLayouts: Map<number, GPUBindGroupLayout>, 
        depthstencil?: GPUDepthStencilState, fragmentTargets?: Iterable<GPUColorTargetState>, vertexShaderSrc?:string, fragShaderSrc?:string){
        const hash = stringHash(label + Array.from(flags.values()))

        if (this.shaderCache.has(hash))
            return this.shaderCache.get(hash)

        // Make bind group layouts
        const modelBindGroupLayout = OBI.device.createBindGroupLayout({ label: label+",Model Bind Group Layout", entries: Shader.getStandardModelBindGroupEntries(flags) })
        const sceneBindGroupLayout = OBI.device.createBindGroupLayout({ label: label+",Scene Bind Group Layout", entries: Shader.getStandardSceneBindGroupEntries(flags) })
        const bindgroupLayouts = [modelBindGroupLayout, sceneBindGroupLayout]
        // push group 2 if exists, else push empty, to be able to push 3 if exists
        if (materialBindGroupLayouts.has(2))
            bindgroupLayouts.push(materialBindGroupLayouts.get(2))
        else
            bindgroupLayouts.push(OBI.device.createBindGroupLayout({ label: "Material Bind Group Layout", entries: [] }))
        if (materialBindGroupLayouts.has(3))
            bindgroupLayouts.push(materialBindGroupLayouts.get(3))
            
        
        if(!depthstencil)
            depthstencil = Shader.DEFAULT_DEPTHSTENCIL_STATE
        
        if(!vertexShaderSrc)
            vertexShaderSrc = standardVertexShaderSrc
        if(!fragShaderSrc)
            fragShaderSrc = standardFragShaderSrc

        const renderPipeline = this.createPipelineWithFlags(label, flags, vertexShaderSrc, fragShaderSrc, depthstencil, bindgroupLayouts, fragmentTargets)

        const shader = new Shader(hash, renderPipeline)
        this.shaderCache.set(hash, shader)
        return shader
    }

    static getShadowShader(lighType:LightType): Shader {

        const label = "OBI Shadow Shader: " + LightType[lighType]
        const hash = stringHash(label)

        if (this.shaderCache.has(hash))
            return this.shaderCache.get(hash)

        const depthStencil: GPUDepthStencilState = {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth32float',
        }

        const emtpyFlags = new Set<string>()

        const modelBindGroupLayout = OBI.device.createBindGroupLayout({ entries: Shader.getStandardModelBindGroupEntries(emtpyFlags) })
        let sceneBindGroupEntries = Shader.getStandardSceneBindGroupEntries(emtpyFlags)

        let shadowFragShaderSrc = undefined
        let colorTargets: Iterable<GPUColorTargetState>= undefined
        if(lighType == LightType.Point){
            shadowFragShaderSrc = shadowCustomDepthFragSrc
            sceneBindGroupEntries.push(Shader.DEFAULT_LIGHT_BINDGROUPLAYOUTENTRY)
            colorTargets = []
        } 
        const sceneBindGroupLayout = OBI.device.createBindGroupLayout({ entries: sceneBindGroupEntries })

        const renderPipeline = this.createPipelineWithFlags(label, emtpyFlags, shadowVertShaderSrc, shadowFragShaderSrc, depthStencil, 
            [modelBindGroupLayout, sceneBindGroupLayout], colorTargets)
        console.log("Created Shadow Shader")

        const shader = new Shader(hash, renderPipeline)
        this.shaderCache.set(hash, shader)
        return shader
    }

    static createPipelineWithFlags(label: string, flags: Set<string>, vertexShaderSrc?: string, fragmentShaderSrc?: string, 
        depthStencil?: GPUDepthStencilState, bindgroupLayouts?: Iterable<GPUBindGroupLayout>, fragmentTargets?: Iterable<GPUColorTargetState>) 
        {
        const hasVertexState = !!vertexShaderSrc
        const hasFragmentState = !!fragmentTargets && !!fragmentShaderSrc

        let vertexState: GPUVertexState = undefined
        if (hasVertexState) {
            vertexState = {
                module: OBI.device.createShaderModule({
                    code: preprocessShader(vertexShaderSrc, flags),
                }),
                entryPoint: 'main',
                buffers: Shader.DEFAULT_VERTEX_BUFFER_LAYOUT
            }
        }

        let fragmentState: GPUFragmentState = undefined
        if (hasFragmentState) {
            fragmentState = {
                module: OBI.device.createShaderModule({
                    code: preprocessShader(fragmentShaderSrc, flags),
                }),
                entryPoint: 'main',
                targets: fragmentTargets
            }
        }

        if (!depthStencil) {
            depthStencil = Shader.DEFAULT_DEPTHSTENCIL_STATE
        }

        const pipeline = OBI.device.createRenderPipeline({
            label: label + Array.from(flags.values()),
            layout: OBI.device.createPipelineLayout({ label: "Pipeline Layout for: " + label, bindGroupLayouts: bindgroupLayouts }),
            vertex: vertexState,
            fragment: fragmentState,
            primitive: {
                topology: 'triangle-list',
                // Culling backfaces pointing away from the camera
                //cullMode: 'back'
            },
            // Enable depth testing since we have z-level positions
            // Fragment closest to the camera is rendered in front
            depthStencil: depthStencil
        } as GPURenderPipelineDescriptor)
        console.log("Total compiled pipelines: " + ShaderLibrary.shaderCache.size)
        return pipeline
    }
}

export enum Lighting {
    BlinnPhong,
    PBR,
    Unlit
}
