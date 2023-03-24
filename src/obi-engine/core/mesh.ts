import { vec2, vec3 } from "gl-matrix"
import OBJLoader from "../utils/objparser"
import OBI from "./obi"

export default class Mesh {

    static cache: Map<string, Mesh> = new Map<string, Mesh>()

    indexData: Array<number>
    positionData: Array<number>
    normalData: Array<number>
    texcoordData: Array<number>
    tangentData: Array<number>
    vertexBuffer: GPUBuffer
    indexBuffer: GPUBuffer
    vertexCount: number
    indexCount: number
    name: string
    vertexComponentLen: number
    aabbHalfWidth: number

    /**
      * Creates and returns a mesh object assembled from the given data. The mesh object can
      * use any shader using the globally defined constanst for attributes and uniforms.
      * It is deposited in the MeshCache using its name.
      * @param {string} name the name of the mesh that will be used to retrieve it from the MeshCache.
      * @param {Array} indexData array of numbers containing the index data for this mesh.
      * @param {Array} positionData array of numbers containing the position data for this mesh.
      * @param {Array} normalData array of numbers containing the normal data for this mesh.
      * @param {Array} texcoordData array of numbers containing the texture cooridinates data for this mesh.
      * */
    constructor(name: string, indexData: Array<number>, positionData: Array<number>, normalData: Array<number>, texcoordData: Array<number>) {

        this.positionData = positionData
        this.normalData = normalData
        this.texcoordData = texcoordData
        this.indexData = indexData
        let tangentData = undefined
        if (normalData && texcoordData) {
            tangentData = this.createTangents(indexData, positionData, normalData, texcoordData)
            this.tangentData = tangentData
        }
        // TODO: Maybe make it more efficient using better layout like in the Example of: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer
        // for now everything is a float 32 number

        let stride = 3 // positiondata
        stride += normalData ? 3 : 0
        stride += tangentData ? 3 : 0
        stride += texcoordData ? 2 : 0

        // create float32 vertex data array
        let vertexBufferSize: number = positionData.length
        vertexBufferSize += normalData ? normalData.length : 0
        vertexBufferSize += tangentData ? tangentData.length : 0
        vertexBufferSize += texcoordData ? texcoordData.length : 0
        let vertexDataF32Array = new Float32Array(vertexBufferSize)

        for (let i = 0; i < indexData.length; i++) {
            let v = i * stride;

            const o0 = i * 3
            const o1 = o0 + 1
            const o2 = o0 + 2

            vertexDataF32Array[v] = positionData[o0]
            v++
            vertexDataF32Array[v] = positionData[o1]
            v++
            vertexDataF32Array[v] = positionData[o2]
            v++

            if(normalData){
                vertexDataF32Array[v] = normalData[o0]
                v++
                vertexDataF32Array[v] = normalData[o1]
                v++
                vertexDataF32Array[v] = normalData[o2]
                v++
            }
            
            if(tangentData){
                vertexDataF32Array[v] = tangentData[o0]
                v++
                vertexDataF32Array[v] = tangentData[o1]
                v++
                vertexDataF32Array[v] = tangentData[o2]
                v++
            }

            if(texcoordData){
                vertexDataF32Array[v] = texcoordData[i * 2]
                v++
                vertexDataF32Array[v] = texcoordData[i * 2 + 1]
            }
        }

        this.vertexCount = indexData.length //How many vertices in the array

        this.vertexBuffer = OBI.device.createBuffer({
                label: 'GPUBuffer store vertex',
                size: vertexDataF32Array.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            })

        const indexDataUINT16 = new Uint16Array(indexData)
        this.indexBuffer = OBI.device.createBuffer({
                label: 'GPUBuffer store vertex index',
                size: indexDataUINT16.byteLength,
                usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
            })

        OBI.device.queue.writeBuffer(this.vertexBuffer, 0, vertexDataF32Array)
        OBI.device.queue.writeBuffer(this.indexBuffer, 0, indexDataUINT16)

        this.name = name

        this.calculateAABB()
        //store this in MeshCache with name as reference.
        Mesh.cache.set(name, this)
        return this
    }

    calculateAABB(){
        let largestExtend = 0
        for(let i = 0; i < this.positionData.length; i++){
            let dataPoint = this.positionData[i]
            if(dataPoint > largestExtend)
                largestExtend = dataPoint
        }
        this.aabbHalfWidth = largestExtend
    }

    createTangents(indexData: Array<number>, positionData: Array<number>, normalData: Array<number>, texcoordData: Array<number>): Array<number> {

        let tangentData = new Array(normalData.length)
        tangentData.fill(0.0)

        for (let i = 0; i < indexData.length; i += 3) {
            // skip vertices for tangents already calculated
            if (tangentData[indexData[i] * 3] != 0.0 &&
                tangentData[indexData[i + 1] * 3] != 0.0 &&
                tangentData[indexData[i + 2] * 3] != 0.0) continue

            let pos1 = vec3.fromValues(positionData[indexData[i] * 3],
                positionData[indexData[i] * 3 + 1],
                positionData[indexData[i] * 3 + 2])
            let pos2 = vec3.fromValues(positionData[indexData[i + 1] * 3],
                positionData[indexData[i + 1] * 3 + 1],
                positionData[indexData[i + 1] * 3 + 2])
            let pos3 = vec3.fromValues(positionData[indexData[i + 2] * 3],
                positionData[indexData[i + 2] * 3 + 1],
                positionData[indexData[i + 2] * 3 + 2])
            let edge1 = vec3.create()
            vec3.subtract(edge1, vec3.clone(pos2), pos1)

            let edge2 = vec3.create()
            vec3.subtract(edge2, vec3.clone(pos3), pos1)

            let uv1 = vec2.fromValues(texcoordData[indexData[i] * 2],
                texcoordData[indexData[i] * 2 + 1])
            let uv2 = vec2.fromValues(texcoordData[indexData[i + 1] * 2],
                texcoordData[indexData[i + 1] * 2 + 1])
            let uv3 = vec2.fromValues(texcoordData[indexData[i + 2] * 2],
                texcoordData[indexData[i + 2] * 2 + 1])

            let deltaUV1 = vec2.create()
            vec2.subtract(deltaUV1, vec2.clone(uv2), uv1)

            let deltaUV2 = vec2.create()
            vec2.subtract(deltaUV2, vec2.clone(uv3), uv1)

            let f = 1.0 / (deltaUV1[0] * deltaUV2[1] - deltaUV2[0] * deltaUV1[1])

            let tangent = vec3.fromValues(f * (deltaUV2[1] * edge1[0] - deltaUV1[1] * edge2[0]),
                f * (deltaUV2[1] * edge1[1] - deltaUV1[1] * edge2[1]),
                f * (deltaUV2[1] * edge1[2] - deltaUV1[1] * edge2[2]))
            let bitangent = vec3.fromValues(f * (-deltaUV2[0] * edge1[0] + deltaUV1[0] * edge2[0]),
                f * (-deltaUV2[0] * edge1[1] + deltaUV1[0] * edge2[1]),
                f * (-deltaUV2[0] * edge1[2] + deltaUV1[0] * edge2[2]))

            if (isNaN(tangent[0])) tangent[0] = 0.0
            if (isNaN(tangent[1])) tangent[1] = 0.0
            if (isNaN(tangent[2])) tangent[2] = 0.0

            tangentData[indexData[i] * 3] = tangent[0]
            tangentData[indexData[i] * 3 + 1] = tangent[1]
            tangentData[indexData[i] * 3 + 2] = tangent[2]
            tangentData[indexData[i + 1] * 3] = tangent[0]
            tangentData[indexData[i + 1] * 3 + 1] = tangent[1]
            tangentData[indexData[i + 1] * 3 + 2] = tangent[2]
            tangentData[indexData[i + 2] * 3] = tangent[0]
            tangentData[indexData[i + 2] * 3 + 1] = tangent[1]
            tangentData[indexData[i + 2] * 3 + 2] = tangent[2]
        }

        return tangentData
    }

    static createFromOBJFile(name: string, path: string, flipUVy:boolean = true) {
        if (Mesh.cache.has(name)) {
            return Mesh.cache.get(name)
        }

        Mesh.cache.set(name, new Mesh(name, [], [], [], []))

        OBJLoader.loadMeshAJAX(path,
            function (objData: { indices: number[]; vertices: number[]; normals: number[]; textureCoordinates: number[] }) {

                //flip Y UV
                if(flipUVy){
                    objData.textureCoordinates.forEach((value, index) => {
                        if((index+1)%2===0){
                            objData.textureCoordinates[index]=1-value
                        }
                    })
                }

                let tempMesh = new Mesh("tempObjModel-"+name,
                    objData.indices,
                    objData.vertices,
                    objData.normals,
                    objData.textureCoordinates)
                let realMesh = Mesh.cache.get(name)

                Object.assign(realMesh, tempMesh)
            },
            function (error: string) { console.error(error) }
        )
        return Mesh.cache.get(name)
    }
}
