import OBI from "./obi";
import vertexShaderSrc from "../../shaders/standard-vert.wgsl"
import fragShaderSrc from "../../shaders/standard-frag.wgsl"
import { preprocessShader } from "./preprocessor";
import shadowShaderSrc from "../../shaders/shadowpass-vert.wgsl";
import simpleRedShaderSrc from "../../shaders/simple-red-frag.wgsl";
import Shader from "./shader";
import { stringHash } from "../utils/utils";

export class ShaderLibrary {
    static shaderCache: Map<number, Shader> = new Map<number, Shader>()

    static getStandardShader(flags: Set<string>) {

        const label = "OBI Standard Shader "

        const hash = stringHash(label + Array.from(flags.values()))

        if (this.shaderCache.has(hash))
            return this.shaderCache.get(hash)

        // Make bind group layouts
        const modelBindGroupLayout = OBI.device.createBindGroupLayout({ entries: Shader.getStandardModelBindGroupEntries(flags) })
        const sceneBindGroupLayout = OBI.device.createBindGroupLayout({ entries: Shader.getStandardSceneBindGroupEntries(flags) })
        const materialBindGroupLayout = OBI.device.createBindGroupLayout({ entries: Shader.getStandardMaterialBindGroupEntries(flags) })

        const renderPipeline = this.createPipelineWithFlags(label, flags, vertexShaderSrc, fragShaderSrc, Shader.DEFAULT_DEPTHSTENCIL_STATE, [modelBindGroupLayout, sceneBindGroupLayout, materialBindGroupLayout])
        console.log("Created Standard Shader variant for: " + Array.from(flags.values()))

        const shader = new Shader(hash, renderPipeline)
        this.shaderCache.set(hash, shader)
        return shader
    }

    static getCustomShader(flags: Set<string>, materialBindGroupLayouts: Map<number, GPUBindGroupLayout>): Shader {
        const label = "OBI Custom Material Shader "

        const hash = stringHash(label + Array.from(flags.values()))

        if (this.shaderCache.has(hash))
            return this.shaderCache.get(hash)

        // Make bind group layouts
        const modelBindGroupLayout = OBI.device.createBindGroupLayout({ entries: Shader.getStandardModelBindGroupEntries(flags) })
        const sceneBindGroupLayout = OBI.device.createBindGroupLayout({ entries: Shader.getStandardSceneBindGroupEntries(flags) })
        const bindgroupLayouts = [modelBindGroupLayout, sceneBindGroupLayout]
        // push group 2 if exists, else push empty, to be able to push 3 if exists
        if (materialBindGroupLayouts.has(2))
            bindgroupLayouts.push(materialBindGroupLayouts.get(2))
        else
            bindgroupLayouts.push(OBI.device.createBindGroupLayout({ entries: [] }))
        if (materialBindGroupLayouts.has(3))
            bindgroupLayouts.push(materialBindGroupLayouts.get(3))

        const renderPipeline = this.createPipelineWithFlags(label, flags, vertexShaderSrc, fragShaderSrc, Shader.DEFAULT_DEPTHSTENCIL_STATE, bindgroupLayouts)
        console.log("Created Standard Shader variant for: " + Array.from(flags.values()))

        const shader = new Shader(hash, renderPipeline)
        this.shaderCache.set(hash, shader)
        return shader
    }

    static getShadowShader(): Shader {

        const label = "OBI Shadow Shader"
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
        const sceneBindGroupLayout = OBI.device.createBindGroupLayout({ entries: Shader.getStandardSceneBindGroupEntries(emtpyFlags) })

        const renderPipeline = this.createPipelineWithFlags(label, emtpyFlags, shadowShaderSrc, undefined, depthStencil, [modelBindGroupLayout, sceneBindGroupLayout])
        console.log("Created Shadow Shader")

        const shader = new Shader(hash, renderPipeline)
        this.shaderCache.set(hash, shader)
        return shader
    }

    static createPipelineWithFlags(label: string, flags: Set<string>, vertexShaderSrc?: string, fragmentShaderSrc?: string, depthStencil?: GPUDepthStencilState, bindgroupLayouts?: Iterable<GPUBindGroupLayout>) {
        const hasVertexState = !!vertexShaderSrc
        const hasFragmentState = !!fragmentShaderSrc

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
                targets: [
                    {
                        format: OBI.format
                    }
                ]
            }
        }

        if (!depthStencil) {
            depthStencil = Shader.DEFAULT_DEPTHSTENCIL_STATE
        }

        const pipeline = OBI.device.createRenderPipeline({
            label: label + Array.from(flags.values()),
            layout: OBI.device.createPipelineLayout({ label: "Layout Descriptor for: " + label, bindGroupLayouts: bindgroupLayouts }),
            vertex: vertexState,
            fragment: fragmentState,
            primitive: {
                topology: 'triangle-list',
                // Culling backfaces pointing away from the camera
                cullMode: 'back'
            },
            // Enable depth testing since we have z-level positions
            // Fragment closest to the camera is rendered in front
            depthStencil: depthStencil
        } as GPURenderPipelineDescriptor)

        return pipeline
    }
}

export enum Lighting {
    BlinnPhong,
    PBR,
    Unlit
}
