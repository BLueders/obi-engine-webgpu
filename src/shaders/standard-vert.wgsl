#import utils.wgsl

@group(0) @binding(0) var<uniform> model : Model;
@group(1) @binding(0) var<uniform> scene : Scene;

#if RECEIVES_SHADOWS
    @group(1) @binding(5) var<uniform> dirLightMatrix: mat4x4<f32>;
#endif

@vertex
fn main(in : VertexIn) -> VertexOut{

    var out: VertexOut;
    
    // out.position = M * in.position;
    // out.worldPosition = out.position;
    // out.position = P * V * out.position;
    out.worldPosition = model.modelMatrix * in.position;
    out.position = model.mvpMatrix * in.position;
    //out.position = scene.projectionMatrix * scene.viewMatrix * model.modelMatrix * in.position;
    out.uv = in.uv;

    var n = normalize(model.normalMatrix * vec4<f32>(in.normal,1)).xyz;
    var t = normalize(model.normalMatrix * vec4<f32>(in.tangent,1)).xyz;
    // re-orthogonalize T with respect to N (Gram-Schmidt process, to adjust TBN for large model smoothed tangents)
    t = normalize(t - dot(t, n) * n);
    var b = cross(t, n);

    out.tangent = t;
    out.bitangent = b;
    out.normal = n;

#if RECEIVES_SHADOWS
    let posFromLight : vec4<f32> = dirLightMatrix * model.modelMatrix * vec4<f32>(in.position.xyz, 1.0);

    // Convert XY to (0, 1)
    // Y is flipped because texture coords are Y-down.
    out.shadowPos = vec3<f32>(
        posFromLight.xy * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5, 0.5),
        posFromLight.z
    );
#endif

    return out;
}