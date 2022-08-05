#import utils.wgsl

@group(0) @binding(0) var<uniform> modelMatrix : mat4x4<f32>;
@group(0) @binding(1) var<uniform> viewMatrix : mat4x4<f32>;
@group(0) @binding(2) var<uniform> projMatrix : mat4x4<f32>;

@vertex
fn main(in : VertexIn) -> @builtin(position) vec4<f32>{
   
    var out = projMatrix * viewMatrix * modelMatrix * in.position;
    
    return out;
}