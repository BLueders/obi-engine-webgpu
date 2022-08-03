import { mat3, mat4, quat, vec3, vec4 } from "gl-matrix";
import OBI from "./obi-engine/core/obi";
import { Camera, OrbiterCameraController } from "./obi-engine/core/camera";
import Material from "./obi-engine/core/material";
import { CubeMapTexture, Texture } from "./obi-engine/core/texture";
import Scene from "./obi-engine/core/scene";
import Model from "./obi-engine/core/model";
import Primitives from "./obi-engine/core/primitives";
import Input from "./obi-engine/utils/input";
import { Light, LightType } from "./obi-engine/core/light";
import { Lighting } from "./obi-engine/core/pipeline-library";
import { preprocessShader } from "./obi-engine/core/preprocessor";
import Environment from "./obi-engine/core/environment";

// This will execute the setup function once the whole document has been loaded.
window.addEventListener("load", function () {
    run()
});

async function run() {

    const canvas = document.querySelector("canvas")
    const initSuccess = await OBI.initWebGPU(canvas)
    if (!initSuccess) return

    const albedoMap = await Texture.loadAsync("./assets/medieval-cobblestone-albedo.png")
    const normalMap = await Texture.loadAsync("./assets/medieval-cobblestone-normal.png")

    const cubeMap = await CubeMapTexture.loadAsyncFromImages(
        "./assets/skybox/skybox_right.png",
        "./assets/skybox/skybox_left.png",
        "./assets/skybox/skybox_up.png",
        "./assets/skybox/skybox_down.png",
        "./assets/skybox/skybox_front.png",
        "./assets/skybox/skybox_back.png")

    const scene = new Scene(new Environment(cubeMap))

    Input.initialize(OBI.context.canvas as HTMLCanvasElement)

    const controller = new OrbiterCameraController(OBI.context.canvas as HTMLCanvasElement, scene.mainCamera)

    const meshes = [Primitives.getCubeMesh(), Primitives.getSphereMesh(), Primitives.getPyramidMesh(), Primitives.getCylinderMesh()]

    const NUM_MODELS = 50.0
    let models:Model[] = []
    for (let index = 0; index < NUM_MODELS; index++) {
        const mat = new Material(vec4.fromValues(index / NUM_MODELS, 0, 0, 1))
        //const mat = new Material(vec4.fromValues(Math.random(), Math.random(), Math.random(), 1))
        mat.albedoMap = Math.random() > 0.5 ? albedoMap : undefined
        mat.normalMap = Math.random() > 0.5 ? normalMap : undefined
        mat.lighting = Math.random() > 0.5 ? Lighting.BlinnPhong : Lighting.Unlit
        const model = new Model(meshes[Math.floor(Math.random() * 4)], mat)
        model.transform.position[0] = 4
        if(index!=0){
            model.transform.setParent(models[index-1].transform)
        }
        models.push(model)
        scene.addModel(model)
    }

    // for (let i = 0; i < 30; i++) {
    //     for (let j = 0; j < 30; j++) {
    //         const mat = new Material(vec4.fromValues(Math.random(), Math.random(), Math.random(), 1))
    //         mat.albedoMap = Math.random() > 0.5 ? albedoMap : undefined
    //         mat.normalMap = Math.random() > 0.5 ? normalMap : undefined
    //         mat.lighting = Math.random() > 0.5 ? Lighting.BlinnPhong : Lighting.Unlit

    //         //mat.lighting = Lighting.BlinnPhong
    //         scene.addModel(new Model(meshes[Math.floor(Math.random() * 4)], mat, vec3.fromValues(i * 2 - 30, 0, j * 2 - 30)))
    //     }
    // }

    quat.fromEuler(scene.dirLight.transform.rotation, -45, 90, 0)

    // const LIGHTCOUNT = 10
    // const lights: Light[] = []
    // for (let i = 0; i < LIGHTCOUNT; i++) {
    //     const pointLight = new Light(LightType.Point, vec3.fromValues(Math.sin((i / LIGHTCOUNT) * 2 * Math.PI) * 15, 2, Math.cos((i / LIGHTCOUNT) * 2 * Math.PI) * 15))
    //     pointLight.range = 15
    //     pointLight.intensity = 3
    //     pointLight.color = vec3.fromValues(Math.random(), Math.random(), Math.random())
    //     scene.addLight(pointLight)
    //     lights.push(pointLight)
    // }

    function frame() {

        // for (let i = 0; i < LIGHTCOUNT; i++) {
        //     const timer = performance.now() / 2000
        //     const radius = Math.sin(timer) * 30
        //     const position: vec3 = vec3.fromValues(Math.sin((i / LIGHTCOUNT + timer / 4) * 2 * Math.PI) * radius, 2, Math.cos((i / LIGHTCOUNT + timer / 4) * 2 * Math.PI) * radius)
        //     lights[i].transform.position = position
        // }

        //quat.fromEuler(models[0].transform.rotation, 0, performance.now()/100, 0)
        models.forEach(model => quat.fromEuler(model.transform.rotation, 0, Math.sin(performance.now()/1000)*7, 0))

        Input.update()
        controller.update()
        scene.draw()
        requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
}