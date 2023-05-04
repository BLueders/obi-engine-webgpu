#import utils.wgsl
#import lighting.wgsl

// Scene bind group
@group(1) @binding(0) var<uniform> scene : Scene;
#if BLINNPHONG_LIGHTING
//@group(1) @binding(1) var<uniform> ambientLightColor : vec4<f32>;
@group(1) @binding(2) var<uniform> lightData : Light;
#if RECEIVES_SHADOWS
#if DIRECTIONAL_LIGHT_PASS
    @group(1) @binding(3) var shadowMap: texture_depth_2d;
#endif
#if POINT_LIGHT_PASS
    @group(1) @binding(3) var shadowMap: texture_depth_cube;
#endif
    @group(1) @binding(4) var shadowSampler: sampler_comparison;
#endif
#endif

// Texture bind group
@group(2) @binding(0) var<uniform> color : vec4<f32>;
@group(2) @binding(1) var defaultSampler : sampler;
@group(2) @binding(2) var albedoMap : texture_2d<f32>;
@group(2) @binding(3) var normalMap : texture_2d<f32>;
// @group(2) @binding(4) var emissiveMap : texture_2d<f32>;

@fragment
fn main(in: VertexOut) -> @location(0) vec4<f32> {

    var normalInfo = getNormalInfo(in);

    var normal = normalInfo.n;
    var finalColor : vec3<f32>;

#if BLINNPHONG_LIGHTING
    //var ambient = ambientLightColor;
    //ambient = vec4<f32>(0,0,0,0);
    var dirDir = lightData.direction.xyz;
    var dirColor = lightData.color.rgb;

    var viewDir = normalize(scene.viewPosition.xyz - in.worldPosition.xyz);

    var lightResult = vec3(0.0, 0.0, 0.0);
    // ambient
    //lightResult += ambient.rgb * ambient.a; // alpha = intensity
#if DIRECTIONAL_LIGHT_PASS
    var dirBlinnPhong = blinnphongDirLight(dirDir, dirColor, normal, viewDir);

#if RECEIVES_SHADOWS
    var inRange = f32(in.shadowPos.x >= 0.0 &&
                  in.shadowPos.x <= 1.0 &&
                  in.shadowPos.y >= 0.0 &&
                  in.shadowPos.y <= 1.0 &&
                  in.shadowPos.z >= 0.0 &&
                  in.shadowPos.z <= 1.0);

    var shadowPos = in.shadowPos;// / in.shadowPos.w;

    // apply Percentage-closer filtering (PCF)
    // sample nearest 9 texels to smooth result
    var shadow : f32 = 0.0;
    let size = f32(textureDimensions(shadowMap).x);
    var bias = max(0.005 * (1.0 - dot(normal, -dirDir.xyz)), 0.001); 
    
    for (var y : i32 = -1 ; y <= 1 ; y = y + 1) {
        for (var x : i32 = -1 ; x <= 1 ; x = x + 1) {
            let offset = vec2<f32>(f32(x) / size, f32(y) / size);
            shadow = shadow + textureSampleCompare(
                shadowMap, 
                shadowSampler,
                shadowPos.xy + offset, 
                shadowPos.z - bias  // apply a small bias to avoid acne
            );
        }
    }
    shadow = shadow / 9.0;

    // shadow = textureSampleCompare(
    //             shadowMap, 
    //             shadowSampler,
    //             shadowPos.xy - biasOffset.xy, 
    //             shadowPos.z// - bias  // apply a small bias to avoid acne
    //         );
    dirBlinnPhong *= clamp(shadow + (1-inRange),0,1);
#endif
    lightResult += dirBlinnPhong;
#endif

#if POINT_LIGHT_PASS
    var pointBlinnPhong = blinnphongPointLight(lightData, normal, viewDir, in.worldPosition.xyz);

#if RECEIVES_SHADOWS
    var fragToLight = in.worldPosition.xyz - lightData.position.xyz; 
    var shadow = textureSampleCompare(
            shadowMap, 
            shadowSampler,
            fragToLight, 
            length(fragToLight)/lightData.range - 0.01 // apply a small bias to avoid acne
        );
    pointBlinnPhong *= shadow;

#endif
    lightResult += pointBlinnPhong;
#endif

    finalColor = color.rgb * lightResult;

#else
    finalColor = color.rgb;
#endif

#if HAS_ALBEDO_MAP
    finalColor *= textureSample(albedoMap, defaultSampler, in.uv).rgb;
#endif

//    gamma correction
    finalColor = finalColor / (finalColor + vec3<f32>(1.0));
    finalColor = pow(finalColor, vec3<f32>(1.0/2.2));

   return vec4<f32>(finalColor,color.a);
}