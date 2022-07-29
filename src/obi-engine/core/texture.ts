import OBI from "./obi";

export class Texture{

    static cache: Map<string, Texture> = new Map<string, Texture>()

    width: Number;
    height: Number;
    name: string;
    gpuTexture: GPUTexture;

    constructor(width: Number, height: Number, name:string){
        this.name = name;
        this.width = width;
        this.height = height;
    }

    static async loadAsync(name:string, url:string):Promise<Texture>{
        // fetch image from url and extract response
        const imgResponse = await fetch(url)
        const img = await imgResponse.blob()
    
        // make into image object
        const bitmap = await createImageBitmap(img)
        const textureSize = [bitmap.width, bitmap.height]
    
        const texture = new Texture(bitmap.width, bitmap.height, name)

        texture.gpuTexture = OBI.device.createTexture({
            size: textureSize,
            format: 'rgba8unorm',   // default RGBA
            usage:
                GPUTextureUsage.TEXTURE_BINDING |   // can be bound by groups
                GPUTextureUsage.COPY_DST |          // can be written to by JS to update
                GPUTextureUsage.RENDER_ATTACHMENT   // can be used as attachment to render pass
        })
        OBI.device.queue.copyExternalImageToTexture(
            {source: bitmap},   // from where
            {texture: texture.gpuTexture}, // to where
            textureSize         // how much
        )
        return texture;
    }
}