import OBI from "./obi"
import { Texture } from "./texture"

export class Uniform {
    label: string
    group: number
    binding: number
    visibility: number

    constructor(group:number, binding:number, visibility:number, label?:string){
        this.binding = binding
        this.group = group
        this.visibility = visibility
        this.label = label || "Unlabeled"
    }
}

export class BufferUniform extends Uniform {
    buffer: GPUBuffer
    size: number

    constructor(group:number, binding:number, visibility:number, size:number, label?:string){
        super(group, binding, visibility, label)
        this.size = size
        this.buffer = OBI.device.createBuffer({
            label: 'GPUBuffer: ' + label,
            size: size,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
    }
}

export class TextureUniform extends Uniform {
    texture: Texture
    sampleType: GPUTextureSampleType
    viewDimension: GPUTextureViewDimension
    multisampled: boolean

    constructor(group:number, binding:number, visibility:number, texture:Texture, 
        sampleType: GPUTextureSampleType, viewDimensions:GPUTextureViewDimension, multisampled:boolean, label?:string){
        super(group, binding, visibility, label)
        this.texture = texture
        this.sampleType = sampleType
        this.multisampled = multisampled
    }
}

export class RGBATextureUniform extends TextureUniform {
    constructor(group:number, binding:number, visibility:number, texture:Texture, label?:string){
        super(group, binding, visibility, texture, 'float', '2d', false, label)
    }
}

export class DepthTextureUniform extends TextureUniform {
    constructor(group:number, binding:number, visibility:number, texture:Texture, label?:string){
        super(group, binding, visibility, texture, 'depth', '2d', false, label)
    }
}

export class CubeTextureUniform extends TextureUniform {
    constructor(group:number, binding:number, visibility:number, texture:Texture, label?:string){
        super(group, binding, visibility, texture, 'float', 'cube', false, label)
    }
}

export class SamplerUniform extends Uniform {
    samplerType: GPUSamplerBindingType
    samplerDescriptor: GPUSamplerDescriptor

    constructor(group:number, binding:number, visibility:number, samplerType: GPUSamplerBindingType, samplerDescriptor: GPUSamplerDescriptor, label?:string){
        super(group, binding, visibility, label)
        this.samplerType = samplerType
        this.samplerDescriptor = samplerDescriptor
    }
}

export class RGBASamplerUniform extends SamplerUniform {
    constructor(group:number, binding:number, visibility:number, label?:string){
        const samplerDescriptor: GPUSamplerDescriptor = {
            label: label || "Unlabeled",
            addressModeU: 'repeat',
            addressModeV: 'repeat',
            magFilter: 'linear',
            minFilter: 'linear'
        }
        super(group, binding, visibility, 'filtering', samplerDescriptor, label)
    }
}

export class CompareSamplerUniform extends SamplerUniform{
    constructor(group:number, binding:number, visibility:number, label?:string){
        const samplerDescriptor: GPUSamplerDescriptor = {
            label: label || "Unlabeled",
            compare: 'less',
        }
        super(group, binding, visibility, 'comparison', samplerDescriptor, label)
    }
}