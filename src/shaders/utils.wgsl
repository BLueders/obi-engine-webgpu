struct VertexOut {
    @builtin(position) position : vec4<f32>,
    @location(0) uv: vec2<f32>,
    @location(1) worldPosition: vec4<f32>,
    @location(2) tangent: vec3<f32>,
    @location(3) bitangent: vec3<f32>,
    @location(4) normal: vec3<f32>,
#if RECEIVES_SHADOWS
    @location(5) shadowPos: vec3<f32>,
#endif
};

struct VertexIn {
    @location(0) position : vec4<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) tangent : vec3<f32>,
    @location(3) uv : vec2<f32>
};

struct Scene {
    viewMatrix : mat4x4<f32>,
    projectionMatrix : mat4x4<f32>,
    viewPosition : vec4<f32>
};

struct Model {
    modelMatrix : mat4x4<f32>,
    normalMatrix : mat4x4<f32>, // has to be 4x4 because of min stride vec4<float32>
    mvpMatrix : mat4x4<f32>
}