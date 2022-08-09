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

    modelBuffer: GPUBuffer
    sceneBuffer: GPUBuffer
    matrixBindGroup: GPUBindGroup

    constructor(hash: number, renderPipeline: GPURenderPipeline) {
        this.hash = hash
        this.renderPipeline = renderPipeline

        // Get ready model and scene matrix uniforms buffer
        this.modelBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer Model 4x4 matrix',
            size: 4 * 4 * 4 + // 4 x 4 x float32 model matrix
                4 * 4 * 4, // 4 x 4 x float32 inv trans matrix (stride has to be min 4xfloat32)
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })

        this.sceneBuffer = OBI.device.createBuffer({
            label: 'GPUBuffer Scene Data',
            size: 4 * 4 * 4 + // 4 x 4 float32 view matrix
                4 * 4 * 4 + // 4 x 4 float32 projection matrix
                3 * 4,      // 3 * float32 camera position
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })

        const entries = [{
            binding: 0, // model data
            resource: {
                buffer: this.modelBuffer
            }
        }, {
            binding: 1, // scene data
            resource: {
                buffer: this.sceneBuffer
            }
        }]

        this.matrixBindGroup = OBI.device.createBindGroup({
            label: 'matrix bind group',
            layout: this.renderPipeline.getBindGroupLayout(0),
            entries: entries
        })
    }
}