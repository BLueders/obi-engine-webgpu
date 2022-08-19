#import utils.wgsl
#import lighting.wgsl

// Scene bind group
@group(1) @binding(0) var<uniform> scene : Scene;
#if BLINNPHONG_LIGHTING
@group(1) @binding(1) var<uniform> ambientLightColor : vec4<f32>;
#endif

// Texture bind group
@group(2) @binding(0) var<uniform> color : vec4<f32>;
@group(2) @binding(1) var defaultSampler : sampler;
@group(2) @binding(2) var albedoMap : texture_2d<f32>;
@group(2) @binding(3) var normalMap : texture_2d<f32>;
// @group(2) @binding(4) var emissiveMap : texture_2d<f32>;

@fragment
fn main(in: VertexOut) -> @location(0) vec4<f32> {
var finalColor = vec3<f32>(0,0,0);
#if BLINNPHONG_LIGHTING
    var ambient = ambientLightColor;
    finalColor = color.rgb * ambient.rgb * ambient.a; // alpha = intensity
#else
    finalColor = color.rgb;
#endif

#if HAS_ALBEDO_MAP
    finalColor *= textureSample(albedoMap, defaultSampler, in.uv).rgb;
#endif
//    gamma correction
    // finalColor = finalColor / (finalColor + vec3<f32>(1.0));
    // finalColor = pow(finalColor, vec3<f32>(1.0/2.2));  
   return vec4<f32>(finalColor,color.a);
}