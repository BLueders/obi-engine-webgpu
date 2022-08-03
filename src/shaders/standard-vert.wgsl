#import utils.wgsl

@group(0) @binding(0) var<uniform> modelMatrix : mat4x4<f32>;
@group(0) @binding(1) var<uniform> viewMatrix : mat4x4<f32>;
@group(0) @binding(2) var<uniform> projMatrix : mat4x4<f32>;
@group(0) @binding(3) var<uniform> invTransData : mat4x4<f32>; // has to be mat4x4, because mat3x3 does not work properly (will be vec4 anyways, since wgsl can't do array stuctures with less than 16 bytes)
@group(0) @binding(4) var<uniform> camPos : vec3<f32>;

@vertex
fn main(in : VertexIn) -> VertexOut{

    var out: VertexOut;
    
    // construct invTrans matrix from stupid mat4x4 uniform that cant be mat3x3
    var invTrans = mat3x3<f32>(invTransData[0][0], invTransData[0][1], invTransData[0][2],
                               invTransData[0][3], invTransData[1][0], invTransData[1][1],
                               invTransData[1][2], invTransData[1][3], invTransData[2][0]);

    var M = modelMatrix;
    var V = viewMatrix;
    var P = projMatrix;

    out.position = M * in.position;
    out.worldPosition = out.position;
    out.position = P * V * out.position;
    out.uv = in.uv;

    var n = normalize(invTrans * in.normal);
    var t = normalize(invTrans * in.tangent);
    // re-orthogonalize T with respect to N (Gram-Schmidt process, to adjust TBN for large model smoothed tangents)
    t = normalize(t - dot(t, n) * n);
    var b = cross(t, n);

    out.tangent = t;
    out.bitangent = b;
    out.normal = n;

    var camPosTem = camPos;

    return out;
}