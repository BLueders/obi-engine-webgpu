import OBI from "./obi"

export default class Shader {

    static DEFAULT_VERTEX_BUFFER_LAYOUT: Iterable<GPUVertexBufferLayout> = [{
        arrayStride: 11 * 4,
        attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3', },       // position
        { shaderLocation: 1, offset: 3 * 4, format: 'float32x3', },   // normal
        { shaderLocation: 2, offset: 6 * 4, format: 'float32x3', },   // tangent
        { shaderLocation: 3, offset: 9 * 4, format: 'float32x2', },   // uv
        ]
    }]

    static DEFAULT_DEPTHSTENCIL_STATE: GPUDepthStencilState = {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus',
    }

    static DEFAULT_MODEL_BINDGROUPLAYOUTENTRY: GPUBindGroupLayoutEntry = {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
            type: 'uniform',
        },
    }

    static DEFAULT_CAMERA_BINDGROUPLAYOUTENTRY: GPUBindGroupLayoutEntry = {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: {
            type: 'uniform',
        },
    }

    static DEFAULT_DIRLIGHTING_BINDGROUPLAYOUTENTRY: GPUBindGroupLayoutEntry = {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
            type: 'uniform',
        },
    }

    static DEFAULT_SHADOW_BINDGROUPENTRIES: GPUBindGroupLayoutEntry[] = [{
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
            sampleType: 'depth',
            viewDimension: '2d'
        }
    }, {
        binding: 3,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {
            type: 'comparison',
        },
    }, {
        binding: 4,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
            type: 'uniform',
        },
    }]


    static HAS_TINT_COLOR_FLAG = "HAS_TINT_COLOR"
    static HAS_ALBEDO_MAP_FLAG = "HAS_ALBEDO_MAP"
    static HAS_NORMAL_MAP_FLAG = "HAS_NORMAL_MAP"
    static HAS_ROUGHNESS_MAP_FLAG = "HAS_ROUGHNESS_MAP"
    static HAS_METALLIC_MAP_FLAG = "HAS_METALLIC_MAP"
    static HAS_HEIGHT_MAP_FLAG = "HAS_HEIGHT_MAP"
    static HAS_AO_MAP_FLAG = "HAS_AO_MAP"
    static HAS_EMISSIVE_MAP_FLAG = "HAS_EMISSIVE_MAP"

    static BLINNPHONG_LIGHTING_FLAG = "BLINNPHONG_LIGHTING"

    static RECEIVE_SHADOWS_FLAG = "RECEIVES_SHADOWS"
    static CAST_SHADOWS_FLAG = "CAST_SHADOWS"

    static ALL_FLAGS = [Shader.HAS_ALBEDO_MAP_FLAG,
    Shader.HAS_ALBEDO_MAP_FLAG,
    Shader.HAS_NORMAL_MAP_FLAG,
    Shader.HAS_ROUGHNESS_MAP_FLAG,
    Shader.HAS_METALLIC_MAP_FLAG,
    Shader.HAS_HEIGHT_MAP_FLAG,
    Shader.HAS_AO_MAP_FLAG,
    Shader.HAS_EMISSIVE_MAP_FLAG,
    Shader.BLINNPHONG_LIGHTING_FLAG,
    Shader.RECEIVE_SHADOWS_FLAG,
    Shader.CAST_SHADOWS_FLAG]

    hash: number
    renderPipeline: GPURenderPipeline

    constructor(hash: number, renderPipeline: GPURenderPipeline) {
        this.hash = hash
        this.renderPipeline = renderPipeline
    }

    static getStandardModelBindGroupEntries(flags:Set<string>){
        const modelBindGroupEntries = [Shader.DEFAULT_MODEL_BINDGROUPLAYOUTENTRY]
        if (flags.has(Shader.BLINNPHONG_LIGHTING_FLAG)) {
            modelBindGroupEntries.push({
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {
                    type: 'uniform',
                }
            })
        }
        return modelBindGroupEntries
    }

    static getStandardSceneBindGroupEntries(flags:Set<string>){
        const sceneBindGroupEntries = [Shader.DEFAULT_CAMERA_BINDGROUPLAYOUTENTRY]
        if (flags.has(Shader.BLINNPHONG_LIGHTING_FLAG)) {
            sceneBindGroupEntries.push(Shader.DEFAULT_DIRLIGHTING_BINDGROUPLAYOUTENTRY)
        }
        if (flags.has(Shader.RECEIVE_SHADOWS_FLAG)) {
            Shader.DEFAULT_SHADOW_BINDGROUPENTRIES.forEach(value => sceneBindGroupEntries.push(value))
        }
        return sceneBindGroupEntries
    }

    static getStandardMaterialBindGroupEntries(flags:Set<string>){
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
        return materialBindGroupEntries
    }
}