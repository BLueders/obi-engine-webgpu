
@group(0) @binding(0) var<uniform> viewMatrix : mat4x4<f32>;
@group(0) @binding(1) var<uniform> projMatrix : mat4x4<f32>;

struct VertexOut {
    @builtin(position) position : vec4<f32>,
    @location(0) uvw: vec3<f32>,
};

@vertex
fn vert(@location(0) position : vec4<f32>,) -> VertexOut {
    var out: VertexOut;
    out.position = projMatrix * viewMatrix * position;
    out.uvw = position.xyz;
    return out;
}

@group(1) @binding(0) var defaultSampler : sampler;
@group(1) @binding(1) var cubeMap : texture_cube<f32>;

@fragment
fn frag(in: VertexOut) -> @location(0) vec4<f32> { 
    return textureSample(cubeMap, defaultSampler, in.uvw);
}