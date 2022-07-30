@group(0) @binding(0) var<uniform> mvpArray : array<mat4x4<f32>, 3>;
@group(0) @binding(1) var<uniform> invTransData : mat4x4<f32>; // has to be mat4x4, because mat3x3 does not work properly (will be vec4 anyways, since wgsl can't do array stuctures with less than 16 bytes)
@group(0) @binding(2) var<uniform> camPos : vec3<f32>;

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) uv: vec2<f32>,
    @location(1) worldPosition: vec4<f32>,
    @location(2) t: vec3<f32>,
    @location(3) b: vec3<f32>,
    @location(4) n: vec3<f32>,
    @location(5) camPos: vec3<f32>
};

@vertex
fn main(
    @location(0) position : vec4<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) tangent : vec3<f32>,
    @location(3) uv : vec2<f32>
    ) -> VertexOutput {
    var out: VertexOutput;
    
    // construct invTrans matrix from stupid mat4x4 uniform that cant be mat3x3
    var invTrans = mat3x3<f32>(invTransData[0][0], invTransData[0][1], invTransData[0][2],
                               invTransData[0][3], invTransData[1][0], invTransData[1][1],
                               invTransData[1][2], invTransData[1][3], invTransData[2][0]);

    var M = mvpArray[0];
    var V = mvpArray[1];
    var P = mvpArray[2];

    out.position = M * position;
    out.worldPosition = out.position;
    out.position = P * V * out.position;
    out.uv = uv;

    var n = normalize(invTrans * normal);
    var t = normalize(invTrans * tangent);
    // re-orthogonalize T with respect to N (Gram-Schmidt process, to adjust TBN for large model smoothed tangents)
    t = normalize(t - dot(t, n) * n);
    var b = cross(t, n);

    out.t = t;
    out.b = b;
    out.n = n;

    out.camPos = camPos;

    return out;
}