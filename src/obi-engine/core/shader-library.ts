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
        const modelBindGroupEntries = [Shader.DEFAULT_MODEL_BINDGROUPENTRY]
        const sceneBindGroupEntries = [Shader.DEFAULT_CAMERA_BINDGROUPENTRY]
        if (flags.has(Shader.BLINNPHONG_LIGHTING_FLAG)) {
            sceneBindGroupEntries.push(Shader.DEFAULT_DIRLIGHTING_BINDGROUPENTRY)
            modelBindGroupEntries.push({
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {
                    type: 'uniform',
                }
            })
        }
        if (flags.has(Shader.RECEIVE_SHADOWS_FLAG)) {
            Shader.DEFAULT_SHADOW_BINDGROUPENTRIES.forEach(value => sceneBindGroupEntries.push(value))
        }
        const modelBindGroupLayout = OBI.device.createBindGroupLayout({ entries: modelBindGroupEntries })
        const sceneBindGroupLayout = OBI.device.createBindGroupLayout({ entries: sceneBindGroupEntries })

        const materialBindGroupEntries: GPUBindGroupLayoutEntry[] = []

        materialBindGroupEntries.push({
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
                type: 'uniform',
            }
        })

        const hasTextures = flags.has(Shader.HAS_ALBEDO_MAP_FLAG) || flags.has(Shader.HAS_NORMAL_MAP_FLAG) ||
            flags.has(Shader.HAS_ROUGHNESS_MAP_FLAG) || flags.has(Shader.HAS_METALLIC_MAP_FLAG) ||
            flags.has(Shader.HAS_AO_MAP_FLAG) || flags.has(Shader.HAS_HEIGHT_MAP_FLAG) ||
            flags.has(Shader.HAS_EMISSIVE_MAP_FLAG)

        if (hasTextures) {
            materialBindGroupEntries.push({
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: {
                    type: 'filtering'
                },
            })
        }

        if (flags.has(Shader.HAS_ALBEDO_MAP_FLAG)) {
            materialBindGroupEntries.push({
                binding: 2,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: 'float',
                    viewDimension: '2d'
                }
            })
        }

        if (flags.has(Shader.HAS_NORMAL_MAP_FLAG)) {
            materialBindGroupEntries.push({
                binding: 3,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: 'float',
                    viewDimension: '2d'
                }
            })
        }

        if (flags.has(Shader.HAS_ROUGHNESS_MAP_FLAG)) {
            materialBindGroupEntries.push({
                binding: 4,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: 'float',
                    viewDimension: '2d'
                }
            })
        }

        if (flags.has(Shader.HAS_METALLIC_MAP_FLAG)) {
            materialBindGroupEntries.push({
                binding: 5,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: 'float',
                    viewDimension: '2d'
                }
            })
        }

        if (flags.has(Shader.HAS_HEIGHT_MAP_FLAG)) {
            materialBindGroupEntries.push({
                binding: 6,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: 'float',
                    viewDimension: '2d'
                }
            })
        }

        if (flags.has(Shader.HAS_AO_MAP_FLAG)) {
            materialBindGroupEntries.push({
                binding: 7,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: 'float',
                    viewDimension: '2d'
                }
            })
        }

        if (flags.has(Shader.HAS_EMISSIVE_MAP_FLAG)) {
            materialBindGroupEntries.push({
                binding: 8,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: 'float',
                    viewDimension: '2d'
                }
            })
        }

        const materialBindGroupLayout = OBI.device.createBindGroupLayout({ entries: materialBindGroupEntries })

        const renderPipeline = this.createPipelineWithFlags(label, flags, vertexShaderSrc, fragShaderSrc, Shader.DEFAULT_DEPTHSTENCIL_STATE, [modelBindGroupLayout, sceneBindGroupLayout, materialBindGroupLayout])
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

        const modelBindGroupLayout = OBI.device.createBindGroupLayout({ entries: [Shader.DEFAULT_MODEL_BINDGROUPENTRY] })
        const sceneBindGroupLayout = OBI.device.createBindGroupLayout({ entries: [Shader.DEFAULT_CAMERA_BINDGROUPENTRY] })

        const renderPipeline = this.createPipelineWithFlags(label, new Set<string>(), shadowShaderSrc, undefined, depthStencil, [modelBindGroupLayout, sceneBindGroupLayout])
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
