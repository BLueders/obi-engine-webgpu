#import utils.wgsl

@group(0) @binding(0) var<uniform> model : Model;
@group(0) @binding(1) var<uniform> scene : Scene;

@vertex
fn main(in : VertexIn) -> @builtin(position) vec4<f32>{
   
    var out = scene.projectionMatrix * scene.viewMatrix * model.modelMatrix * in.position;
    
    return out;
}