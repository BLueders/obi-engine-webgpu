import { mat3, mat4, quat, vec3, vec4 } from "gl-matrix";
import OBI from "./obi-engine/core/obi";
import { Camera, OrbiterCameraController } from "./obi-engine/core/camera";
import StandardMaterial from "./obi-engine/core/standard-material";
import { CubeMapTexture, Texture } from "./obi-engine/core/texture";
import Scene from "./obi-engine/core/scene";
import Model from "./obi-engine/core/model";
import Primitives from "./obi-engine/core/primitives";
import Input from "./obi-engine/utils/input";
import { Light, LightType } from "./obi-engine/core/light";
import { Lighting } from "./obi-engine/core/shader-library";
import Environment from "./obi-engine/core/environment";
import { Material } from "./obi-engine/core/material";

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

    const NUM_MODELS = 5
    const NUM_MATERIALS = 5
    
    const materials: StandardMaterial[] = []
    for (let i = 0; i < NUM_MATERIALS; i++) {
        const mat = new StandardMaterial(vec4.fromValues(Math.random(), Math.random(), Math.random(), 1))
        Math.random() > 0.5 ? mat.setAlbedoMap(albedoMap) : undefined
        Math.random() > 0.5 ? mat.setNormalMap(normalMap) : undefined
        mat.lighting = Lighting.BlinnPhong
        mat.receivesShadows = true
        mat.castShadows = true

        materials.push(mat)
    }

    for (let i = 0; i < NUM_MODELS; i++) {
        for (let j = 0; j < NUM_MODELS; j++) {
            const mat = materials[Math.floor(Math.random() * NUM_MATERIALS)]

            const model = new Model(meshes[Math.floor(Math.random() * 4)], mat, vec3.fromValues(i * 2 - NUM_MODELS, 0, j * 2 - NUM_MODELS))

            scene.addModel(model)
        }
    }

    const mat = new StandardMaterial(vec4.fromValues(Math.random(), Math.random(), Math.random(), 1))
    mat.setAlbedoMap(albedoMap)
    mat.lighting = Lighting.BlinnPhong
    mat.receivesShadows = true
    mat.castShadows = false
    const model = new Model(Primitives.getPlaneMesh(20, 20), mat, vec3.fromValues(0, -0.5, 0), quat.create(), vec3.fromValues(10, 1, 10))
    scene.addModel(model)

    // const LIGHTCOUNT = 10
    // const lights: Light[] = []
    // for (let i = 0; i < LIGHTCOUNT; i++) {
    //     const pointLight = new Light(LightType.Point, vec3.fromValues(Math.sin((i / LIGHTCOUNT) * 2 * Math.PI) * 15, 6, Math.cos((i / LIGHTCOUNT) * 2 * Math.PI) * 15))
    //     pointLight.range = 15
    //     pointLight.intensity = 20
    //     pointLight.color = vec3.fromValues(Math.random(), Math.random(), Math.random())
    //     scene.addLight(pointLight)
    //     lights.push(pointLight)
    // }
    scene.prepare()

    function frame() {

        if(Input.keyDown("space")){
            for (let i = 0; i < NUM_MATERIALS; i++) {
                materials[i].setAlbedoMap(albedoMap)
                materials[i].setNormalMap(normalMap)
            }
        }

        quat.fromEuler(scene.dirLight.transform.rotation, 75, performance.now() / 50, 0)

        Input.update()
        controller.update()
        scene.draw()
        requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
}