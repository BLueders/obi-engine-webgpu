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
import * as dat from 'dat.gui';

var g_guiData = {
    lightPosX: 0,
    lightPosY: 1,
    lightPosZ: 0
}

// This will execute the setup function once the whole document has been loaded.
window.addEventListener("load", function () {
    run()
});

async function run() {

    var gui = new dat.GUI();
    gui.add(g_guiData, "lightPosX", -9.5, 9.5);
    gui.add(g_guiData, "lightPosY", -9.5, 9.5);
    gui.add(g_guiData, "lightPosZ", -9.5, 9.5);

    const canvas = document.querySelector("canvas")
    const initSuccess = await OBI.initWebGPU(canvas)
    if (!initSuccess) return

    const albedoMap = await Texture.loadAsync("./assets/medieval-cobblestone-albedo.png")
    const normalMap = await Texture.loadAsync("./assets/medieval-cobblestone-normal.png")

    // const cubeMap = await CubeMapTexture.loadAsyncFromImages(
    //     "./assets/skybox/skybox_right.png",
    //     "./assets/skybox/skybox_left.png",
    //     "./assets/skybox/skybox_up.png",
    //     "./assets/skybox/skybox_down.png",
    //     "./assets/skybox/skybox_front.png",
    //     "./assets/skybox/skybox_back.png")

    const cubeMap = await CubeMapTexture.loadAsyncFromImages(
        "./assets/uvTest.jpg",
        "./assets/uvTest.jpg",
        "./assets/uvTest.jpg",
        "./assets/uvTest.jpg",
        "./assets/uvTest.jpg",
        "./assets/uvTest.jpg")

    const scene = new Scene(new Environment(cubeMap))

    Input.initialize(OBI.context.canvas as HTMLCanvasElement)

    const controller = new OrbiterCameraController(OBI.context.canvas as HTMLCanvasElement, scene.mainCamera)

    const meshes = [Primitives.getCubeMesh(), Primitives.getSphereMesh(), Primitives.getPyramidMesh(), Primitives.getCylinderMesh()]

    const NUM_MODELS = 1
    const NUM_MATERIALS = 1

    const mat = new StandardMaterial(vec4.fromValues(1, 1, 1, 1))
    mat.setAlbedoMap(albedoMap)
    mat.lighting = Lighting.BlinnPhong
    mat.receivesShadows = true
    mat.castShadows = true
    const plane = new Model(Primitives.getPlaneMesh(20, 20), mat, vec3.fromValues(0, -0.5, 0), quat.create(), vec3.fromValues(10, 1, 10))
    scene.addModel(plane)

    const plane2 = new Model(Primitives.getPlaneMesh(20, 20), mat, vec3.fromValues(2, 0, 0), quat.fromEuler(quat.create(),45,-90,0), vec3.fromValues(1, 1, 1))
    scene.addModel(plane2)

    const cube = new Model(Primitives.getCubeMesh(), mat, vec3.fromValues(2, 0, 1), quat.create(), vec3.fromValues(1, 1, 1))
    scene.addModel(cube)

    const sphere = new Model(Primitives.getSphereMesh(), mat, vec3.fromValues(-2, 0, 0), quat.create(), vec3.fromValues(1, 1, 1))
    scene.addModel(sphere)

    const pyramid = new Model(Primitives.getPyramidMesh(), mat, vec3.fromValues(1, 1, -2), quat.create(), vec3.fromValues(1, 1, 1))
    scene.addModel(pyramid)

    const wallFront = new Model(Primitives.getCubeMesh(), mat, vec3.fromValues(0, 0, -5), quat.create(), vec3.fromValues(10, 10, 1))
    scene.addModel(wallFront)

    const wallTop = new Model(Primitives.getCubeMesh(), mat, vec3.fromValues(0, 5, 0), quat.create(), vec3.fromValues(10, 1, 10))
    scene.addModel(wallTop)

    const wallRight = new Model(Primitives.getCubeMesh(), mat, vec3.fromValues(5, 0, 0), quat.create(), vec3.fromValues(1, 10, 10))
    scene.addModel(wallRight)

    const wallLeft = new Model(Primitives.getCubeMesh(), mat, vec3.fromValues(-5, 0, 0), quat.create(), vec3.fromValues(1, 10, 10))
    scene.addModel(wallLeft)

    const dirLight = new Light(LightType.Directional, vec3.fromValues(0, 5, 0), quat.fromEuler(quat.create(), 0.5, 0, 0))
    dirLight.color = vec3.fromValues(1, 1, 1)
    dirLight.enableShadows()
    scene.addLight(dirLight)

    const lightPosition = vec3.fromValues(0, 1, 0)
    const pointLight = new Light(LightType.Point, lightPosition)
    pointLight.range = 10
    pointLight.intensity = 1
    pointLight.color = vec3.fromValues(1, 1, 1)
    pointLight.enableShadows()
    scene.addLight(pointLight)

    // const debugMat = new StandardMaterial(vec4.fromValues(1, 1, 0, 1))
    // mat.lighting = Lighting.Unlit
    // mat.receivesShadows = false
    // mat.castShadows = false
    // const lightDebugSphere = new Model(Primitives.getSphereMesh(), debugMat, lightPosition, quat.create(), vec3.fromValues(0.1, 0.1, 0.1))
    // scene.addModel(lightDebugSphere)

    scene.prepare()

    function frame() {

        quat.fromEuler(dirLight.transform.rotation, 25, performance.now() / 50, 0)
        pointLight.transform.position[0] = g_guiData.lightPosX
        pointLight.transform.position[1] = g_guiData.lightPosY
        pointLight.transform.position[2] = g_guiData.lightPosZ
        Input.update()
        controller.update()
        scene.draw()
        requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
}