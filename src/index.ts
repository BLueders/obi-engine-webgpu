import { mat3, mat4, quat, vec3, vec4 } from "gl-matrix";
import OBI from "./obi-engine/core/obi";
import { Camera, OrbiterCameraController } from "./obi-engine/core/camera";
import Material from "./obi-engine/core/material";
import { Texture } from "./obi-engine/core/texture";
import Scene from "./obi-engine/core/scene";
import Model from "./obi-engine/core/model";
import Primitives from "./obi-engine/core/primitives";
import Input from "./obi-engine/utils/input";
import { Light, LightType } from "./obi-engine/core/light";
import { Lighting } from "./obi-engine/core/pipeline-library";
import { preprocessShader } from "./obi-engine/core/preprocessor";

// This will execute the setup function once the whole document has been loaded.
window.addEventListener("load", function () {
    run()
});

async function run() {

    const canvas = document.querySelector("canvas")
    const initSuccess = await OBI.initWebGPU(canvas)
    if (!initSuccess) return

    const albedoMap = await Texture.loadAsync('mainTexture', "./assets/bricks.png")

    const scene = new Scene()

    Input.initialize(OBI.context.canvas as HTMLCanvasElement)

    const controller = new OrbiterCameraController(OBI.context.canvas as HTMLCanvasElement, scene.mainCamera)

    const meshes = [Primitives.getCubeMesh(), Primitives.getSphereMesh(), Primitives.getPyramidMesh(), Primitives.getCylinderMesh()]

    for (let i = 0; i < 30; i++) {
        for (let j = 0; j < 30; j++) {
            const mat = new Material(vec4.fromValues(Math.random(), Math.random(), Math.random(), 1))
            mat.albedoMap = Math.random() > 0.5 ? albedoMap : undefined
            mat.lighting = Math.random() > 0.5 ? Lighting.BlinnPhong : Lighting.Unlit

            //mat.lighting = Lighting.BlinnPhong
            scene.addModel(new Model(meshes[Math.floor(Math.random() * 4)], mat, vec3.fromValues(i * 2 - 30, 0, j * 2 - 30)))
        }
    }

    quat.fromEuler(scene.dirLight.transform.rotation, -45, 90, 0)

    const LIGHTCOUNT = 10
    const lights: Light[] = []
    for (let i = 0; i < LIGHTCOUNT; i++) {
        const pointLight = new Light(LightType.Point, vec3.fromValues(Math.sin((i / LIGHTCOUNT) * 2 * Math.PI) * 15, 2, Math.cos((i / LIGHTCOUNT) * 2 * Math.PI) * 15))
        pointLight.range = 15
        pointLight.intensity = 3
        pointLight.color = vec3.fromValues(Math.random(), Math.random(), Math.random())
        scene.addLight(pointLight)
        lights.push(pointLight)
    }

    function frame() {

        for (let i = 0; i < LIGHTCOUNT; i++) {
            const timer = performance.now() / 2000
            const radius = Math.sin(timer) * 30
            const position: vec3 = vec3.fromValues(Math.sin((i / LIGHTCOUNT + timer / 4) * 2 * Math.PI) * radius, 2, Math.cos((i / LIGHTCOUNT + timer / 4) * 2 * Math.PI) * radius)
            lights[i].transform.position = position
        }

        Input.update()
        controller.update()
        scene.draw()
        requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
}