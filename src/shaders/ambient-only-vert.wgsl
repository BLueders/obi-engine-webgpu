#import utils.wgsl

@group(0) @binding(0) var<uniform> model : Model;
@group(1) @binding(0) var<uniform> scene : Scene;

@vertex
fn main(in : VertexIn) -> VertexOut{

    var out: VertexOut;
    
    out.worldPosition = model.modelMatrix * in.position;
    out.position = model.mvpMatrix * in.position;
    //out.position = scene.projectionMatrix * scene.viewMatrix * model.modelMatrix * in.position;
    out.uv = in.uv;

    return out;
}