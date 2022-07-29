import { mat3, mat4 } from "gl-matrix"
import { Camera } from "./camera"
import Model from "./model"
import OBI from "./obi"
import Pipeline from "./pipeline"

export default class Scene{

    mainCamera: Camera
    pipelines: Map<Pipeline, Model[]>

    constructor(){
        this.mainCamera = new Camera()
        this.pipelines = new Map<Pipeline, Model[]>()
    }

    addModel(model:Model){
        if(!this.pipelines.has(model.material.pipeline)){
            this.pipelines.set(model.material.pipeline, [model])
        } else {
            this.pipelines.get(model.material.pipeline).push(model)
        }
    }

    draw(){

        const commandEncoder = OBI.device.createCommandEncoder()
        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [
                {
                    view: OBI.context.getCurrentTexture().createView(),
                    clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
                    loadOp: 'clear',
                    storeOp: 'store'
                }
            ],
            depthStencilAttachment: {
                view: this.mainCamera.depthMap.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            }
        }

        this.pipelines.forEach((models, pipeline) => {

            const pl = pipeline.gpuPipeline

            const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
            passEncoder.setPipeline(pl)

            models.forEach(model => {

                model.update()
                // set vertex
                passEncoder.setVertexBuffer(0, model.mesh.vertexBuffer)
                passEncoder.setIndexBuffer(model.mesh.indexBuffer, "uint16")

                // update matrices and vertex uniform buffers
                const mvpData = new Float32Array(16 * 3);
                mvpData.set(model.transform.modelMatrix, 0);
                mvpData.set(this.mainCamera.viewMatrix, 16);
                mvpData.set(this.mainCamera.projectionMatrix, 32);
                
                OBI.device.queue.writeBuffer(pipeline.mvpBuffer, 0, mvpData)

                let invTrans3x3: mat3 = mat3.create();
                mat3.normalFromMat4(invTrans3x3, model.transform.modelMatrix);
                OBI.device.queue.writeBuffer(pipeline.invTansBuffer, 0, invTrans3x3 as Float32Array)
                OBI.device.queue.writeBuffer(pipeline.camPosBuffer, 0, this.mainCamera.getPosition() as Float32Array)

                // set uniformGroup for vertex shader
                passEncoder.setBindGroup(0, pipeline.vertexUniformGroup)
                // set textureGroup
                passEncoder.setBindGroup(1, model.material.materialBindGroup)
                // draw vertex count of cube
                passEncoder.drawIndexed(model.mesh.vertexCount)
                // webgpu run in a separate process, all the commands will be executed after submit
            });

            passEncoder.end()
        })

        OBI.device.queue.submit([commandEncoder.finish()])
    }
}