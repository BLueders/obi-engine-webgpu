#import utils.wgsl

@group(0) @binding(0) var<uniform> model : Model;
@group(1) @binding(0) var<uniform> scene : Scene;

@vertex
fn main(in : VertexIn) -> VertexOut{

    var out: VertexOut;

    var M = model.modelMatrix;
    var V = scene.viewMatrix;
    var P = scene.projectionMatrix;

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