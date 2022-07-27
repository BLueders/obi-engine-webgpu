@group(0) @binding(0) var<uniform> mvp : mat4x4<f32>;

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) fragPosition: vec4<f32>
};

@vertex
fn main(@location(0) position : vec4<f32>) -> VertexOutput {
    var out: VertexOutput;
    out.position = mvp * position;
    out.fragPosition = position;
    return out;
}