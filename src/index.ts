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
import Stats from './obi-engine/utils/stats.js';
import Mesh from "./obi-engine/core/mesh";

var g_guiData = {
    lightPosX: 0,
    lightPosY: 1,
    lightPosZ: 0
}

var stats = {
    fps: Stats(),
    memmory: Stats()
};
stats.fps.domElement.style.cssText = 'position:absolute;top:10px;left:0px;';
document.body.appendChild(stats.fps.domElement);
stats.memmory.domElement.style.cssText = 'position:absolute;top:10px;left:80px;';
document.body.appendChild(stats.memmory.domElement);
stats.memmory.showPanel(2); // Panel 2 = memory
stats.fps.showPanel(0); // Panel 0 = fps

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

    const cubeMap = await CubeMapTexture.loadAsyncFromImages(
        "./assets/skybox/skybox_right.png",
        "./assets/skybox/skybox_left.png",
        "./assets/skybox/skybox_up.png",
        "./assets/skybox/skybox_down.png",
        "./assets/skybox/skybox_front.png",
        "./assets/skybox/skybox_back.png")

    // const cubeMap = await CubeMapTexture.loadAsyncFromImages(
    //     "./assets/uvTest.jpg",
    //     "./assets/uvTest.jpg",
    //     "./assets/uvTest.jpg",
    //     "./assets/uvTest.jpg",
    //     "./assets/uvTest.jpg",
    //     "./assets/uvTest.jpg")

    const scene = new Scene(new Environment(cubeMap))

    Input.initialize(OBI.context.canvas as HTMLCanvasElement)

    const controller = new OrbiterCameraController(OBI.context.canvas as HTMLCanvasElement, scene.mainCamera)
    controller.distance = 30

    const mat = new StandardMaterial(vec4.fromValues(1, 1, 1, 1))
    mat.setAlbedoMap(albedoMap)
    //mat.setNormalMap(normalMap)
    mat.lighting = Lighting.BlinnPhong
    mat.receivesShadows = true
    mat.castShadows = true


    const helmet_albedo = await Texture.loadAsync("./assets/helmet/helmet_albedo.jpg")
    const helmet_normal = await Texture.loadAsync("./assets/helmet/helmet_normal.jpg")
    const helmetMat = new StandardMaterial(vec4.fromValues(1,1,1,1))
    helmetMat.setAlbedoMap(helmet_albedo)
    helmetMat.setNormalMap(helmet_normal)
    helmetMat.lighting = Lighting.BlinnPhong
    helmetMat.receivesShadows = true
    helmetMat.castShadows = true
    const helmet = new Model(Mesh.createFromOBJFile("helmet", "./assets/helmet/helmet.obj"), helmetMat, vec3.fromValues(0,8,0), quat.create(), vec3.fromValues(3,3,3))
    scene.addModel(helmet)

    const plane = new Model(Primitives.getPlaneMesh(20, 20), mat, vec3.fromValues(0, -0.5, 0), quat.create(), vec3.fromValues(40, 1, 40))
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

    const wallRight = new Model(Primitives.getCubeMesh(), mat, vec3.fromValues(5, 0, 0.1), quat.create(), vec3.fromValues(1, 10, 10))
    scene.addModel(wallRight)

    const wallLeft = new Model(Primitives.getCubeMesh(), mat, vec3.fromValues(-5, 0, 0.1), quat.create(), vec3.fromValues(1, 10, 10))
    scene.addModel(wallLeft)

    const dirLight = new Light(LightType.Directional, vec3.fromValues(0, 5, 0), quat.fromEuler(quat.create(), 45, 45, 0))
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

    await makeGeometry()
    const lights = makeLights()

    scene.prepare()

    function frame() {

        quat.fromEuler(dirLight.transform.rotation, 25, performance.now() / 50, 0)
        pointLight.transform.position[0] = g_guiData.lightPosX
        pointLight.transform.position[1] = g_guiData.lightPosY
        pointLight.transform.position[2] = g_guiData.lightPosZ
        Input.update()
        controller.update()
        scene.draw()
        
        for (let index = 0; index < lights.length; index++) {
            const light:Light = lights[index].light
            light.transform.position[0] += Math.sin(performance.now() / 1300 + index)*0.2
            light.transform.position[2] += Math.cos(performance.now() / 1700 - index)*0.2
            const debugSphere = lights[index].debugSphere
            vec3.copy(debugSphere.transform.position, light.transform.position)
        }

        stats.fps.update();
        stats.memmory.update();

        requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)

    async function makeGeometry(){

        const albedoMap = await Texture.loadAsync("./assets/medieval-cobblestone-albedo.png")
        const normalMap = await Texture.loadAsync("./assets/medieval-cobblestone-normal.png")

        const meshes = [Primitives.getCubeMesh(), Primitives.getSphereMesh(), Primitives.getCylinderMesh()]

        const NUM_MODELS = 40
        const SPACING = 10
        const NUM_MATERIALS = 1

        const mat = new StandardMaterial(vec4.fromValues(1, 1, 1, 1))
        mat.setAlbedoMap(albedoMap)
        mat.setNormalMap(normalMap)
        mat.lighting = Lighting.BlinnPhong
        mat.receivesShadows = true
        mat.castShadows = true

        const numRows = Math.ceil(Math.sqrt(NUM_MODELS));
        for (let col = 0; col < numRows; col++) {
            for (let row = 0; row < numRows; row++) {
                const pos = vec3.fromValues(row*SPACING - numRows*SPACING/2, 0, col*SPACING - numRows*SPACING/2)
                const scale = vec3.fromValues(Math.random()*2+2, Math.random()*2+2, Math.random()*2+2)
                const model = new Model(meshes[Math.floor(Math.random()*meshes.length)], mat, pos, quat.create(), scale)
                scene.addModel(model)
            }
        }
    }

    function makeLights(){
        const NUM_LIGHTS = 4
        const lights = new Array(NUM_LIGHTS);
        for (let index = 0; index < NUM_LIGHTS; index++) {
            const lightPosition = vec3.fromValues(Math.random()*80-40, 10, Math.random()*80-40)
            const pointLight = new Light(LightType.Point, lightPosition)
            pointLight.range = 40
            pointLight.intensity = 1
            pointLight.color = vec3.fromValues(Math.random(), Math.random(), Math.random())
            pointLight.enableShadows()
            scene.addLight(pointLight)

            const lightSphere = new Model(Primitives.getSphereMesh(), mat, lightPosition, quat.create(), vec3.fromValues(0.2, 0.2, 0.2))
            const lightSphereMat = new StandardMaterial(vec4.fromValues(pointLight.color[0], pointLight.color[1], pointLight.color[2], 1))
            lightSphereMat.lighting = Lighting.BlinnPhong
            lightSphereMat.receivesShadows = false
            lightSphereMat.castShadows = false
            lightSphere.material = lightSphereMat
            scene.addModel(lightSphere)

            lights[index] = {light:pointLight, debugSphere:lightSphere};
        }
        return lights;
    }
}