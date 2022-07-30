import vertexShaderCode from "./shaders/standardVert.wgsl"
import fragmentShaderCode from "./shaders/standardFrag.wgsl"
import * as cube from "./obi-engine/utils/cube"
import { mat3, mat4, quat, vec3, vec4 } from "gl-matrix";
import OBI from "./obi-engine/core/obi";
import { Camera, OrbiterCameraController } from "./obi-engine/core/camera";
import Pipeline from "./obi-engine/core/pipeline";
import Material from "./obi-engine/core/material";
import { Texture } from "./obi-engine/core/texture";
import Scene from "./obi-engine/core/scene";
import Model from "./obi-engine/core/model";
import Primitives from "./obi-engine/core/primitives";
import Input from "./obi-engine/utils/input";

// This will execute the setup function once the whole document has been loaded.
window.addEventListener("load",function(){
    run()
});

async function run(){
    
    const canvas = document.querySelector("canvas")
    const initSuccess = await OBI.initWebGPU(canvas)
    if(!initSuccess) return

    const pipeline = await Pipeline.createBasicPipeline("Test", vertexShaderCode, fragmentShaderCode)

    const mat = new Material(pipeline, vec4.fromValues(1,1,1,0))
    mat.albedoMap = await Texture.loadAsync('mainTexture', "./assets/texture.png")

    mat.updateBindGroup() // This feels like a really crappy solution

    const scene = new Scene()

    Input.initialize(OBI.context.canvas as HTMLCanvasElement)

    const controller = new OrbiterCameraController(OBI.context.canvas as HTMLCanvasElement, scene.mainCamera)

    const cube = new Model(Primitives.getCylinderMesh(), mat)
    scene.addModel(cube)

    //TODO: Fix second model not working
    //scene.addModel(new Model(Primitives.getCubeMesh(), mat, vec3.fromValues(3,0,0)))

    quat.fromEuler(scene.dirLight.transform.rotation, -45, 90, 0)

    function frame(){
        Input.update()
        controller.update()
        //cube.transform.position[2] = -5
        quat.fromEuler(cube.transform.rotation, performance.now() / 50, performance.now() / 50, 0)
        //console.log(scene.mainCamera.getPosition())
        scene.draw()
        requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
}

