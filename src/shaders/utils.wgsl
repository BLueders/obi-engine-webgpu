struct VertexOut {
    @builtin(position) position : vec4<f32>,
    @location(0) uv: vec2<f32>,
    @location(1) worldPosition: vec4<f32>,
    @location(2) tangent: vec3<f32>,
    @location(3) bitangent: vec3<f32>,
    @location(4) normal: vec3<f32>
};

struct VertexIn {
    @location(0) position : vec4<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) tangent : vec3<f32>,
    @location(3) uv : vec2<f32>
};