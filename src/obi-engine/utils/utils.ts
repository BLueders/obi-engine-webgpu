import { mat3, mat4 } from "gl-matrix";

export function stringHash(str: string, seed = 0) {
    let hash = seed;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        let chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

export function toMat4(mat3: mat3) {
    return mat4.fromValues(
        mat3[0], mat3[1], mat3[2], 0,
        mat3[3], mat3[4], mat3[5], 0,
        mat3[6], mat3[7], mat3[8], 0,
        0, 0, 0, 1
    )
}