import OBI from "./obi";

export class Texture {

    width: number;
    height: number;
    gpuTexture: GPUTexture;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    static async loadAsync(url: string): Promise<Texture> {
        // make into image object
        const bitmap = await Texture.loadBitmap(url)
        const textureSize = [bitmap.width, bitmap.height]

        const texture = new Texture(bitmap.width, bitmap.height)

        texture.gpuTexture = OBI.device.createTexture({
            size: textureSize,
            format: 'rgba8unorm',   // default RGBA
            usage:
                GPUTextureUsage.TEXTURE_BINDING |   // can be bound by groups
                GPUTextureUsage.COPY_DST |          // can be written to by JS to update
                GPUTextureUsage.RENDER_ATTACHMENT   // can be used as attachment to render pass
        })
        OBI.device.queue.copyExternalImageToTexture(
            { source: bitmap },   // from where
            { texture: texture.gpuTexture }, // to where
            textureSize         // how much
        )
        return texture;
    }

    static async loadBitmap(url: string) {
        const imgResponse = await fetch(url)
        const img = await imgResponse.blob()

        // make into image object
        return await createImageBitmap(img)
    }
}

export class CubeMapTexture {

    cubemapTexture: GPUTexture

    static async loadAsyncFromImages(right: string, left: string, up: string, down: string, front: string, back: string) {
        // The order of the array layers is [+X, -X, +Y, -Y, +Z, -Z]
        const bitmapPromises = [
            Texture.loadBitmap(right),
            Texture.loadBitmap(left),
            Texture.loadBitmap(up),
            Texture.loadBitmap(down),
            Texture.loadBitmap(front),
            Texture.loadBitmap(back),
        ];
        const bitmaps = await Promise.all(bitmapPromises);

        const cubeMap = new CubeMapTexture();

        cubeMap.cubemapTexture = OBI.device.createTexture({
            dimension: '2d',
            // Create a 2d array texture.
            // Assume each image has the same size.
            size: [bitmaps[0].width, bitmaps[0].height, 6],
            format: 'rgba8unorm',
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT,
        });

        for (let i = 0; i < bitmaps.length; i++) {
            const imageBitmap = bitmaps[i];
            OBI.device.queue.copyExternalImageToTexture(
                { source: imageBitmap },
                { texture: cubeMap.cubemapTexture, origin: [0, 0, i] },
                [imageBitmap.width, imageBitmap.height]
            );
        }

        return cubeMap
    }
}