#import utils.wgsl
#import lighting.wgsl

@group(1) @binding(0) var<uniform> scene : Scene;
@group(1) @binding(2) var<uniform> light: Light;

 struct FragmentOutput {
   @builtin(frag_depth) depth: f32
 }

@fragment
fn main(in: VertexOut) -> FragmentOutput {

    var out: FragmentOutput;
    // get distance between fragment and light source
    var lightDistance = length(in.worldPosition.xyz - light.position.xyz);
    
    // map to [0;1] range by dividing by far_plane
    out.depth = lightDistance / light.range;
    // write this as modified depth
    return out;
}