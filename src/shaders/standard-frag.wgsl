#import utils.wgsl
#import lighting.wgsl

// Scene bind group
@group(1) @binding(0) var<uniform> scene : Scene;
#if BLINNPHONG_LIGHTING
@group(1) @binding(1) var<uniform> ambientDirData : BaseLightData;
#if RECEIVES_SHADOWS
    @group(1) @binding(2) var dirShadowMap: texture_depth_2d;
    @group(1) @binding(3) var shadowSampler: sampler_comparison;
#endif
#endif

// Texture bind group
@group(2) @binding(0) var<uniform> color : vec4<f32>;
@group(2) @binding(1) var defaultSampler : sampler;
@group(2) @binding(2) var albedoMap : texture_2d<f32>;
@group(2) @binding(3) var normalMap : texture_2d<f32>;
// @group(2) @binding(4) var emissiveMap : texture_2d<f32>;

@group(3) @binding(0) var<uniform> pointlightData : array<PointLightData,3>; // max 3 pointlights

@fragment
fn main(in: VertexOut) -> @location(0) vec4<f32> {

    var normalInfo = getNormalInfo(in);

    var normal = normalInfo.n;
    var finalColor : vec3<f32>;

#if BLINNPHONG_LIGHTING
    var ambient = ambientDirData.ambientColor;
    var dirDir = ambientDirData.directionalDir;
    var dirColor = ambientDirData.directionalColor;

    var viewDir = normalize(scene.viewPosition - in.worldPosition.xyz);

    var lightResult = vec3(0.0, 0.0, 0.0);
    // ambient
    lightResult += ambient.rgb * ambient.a; // alpha = intensity

    var dirBlinnPhong = blinnphongDirLight(dirDir.xyz, dirColor.rgb, normal, viewDir);

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
    let size = f32(textureDimensions(dirShadowMap).x);
    for (var y : i32 = -1 ; y <= 1 ; y = y + 1) {
        for (var x : i32 = -1 ; x <= 1 ; x = x + 1) {
            let offset = vec2<f32>(f32(x) / size, f32(y) / size);
            shadow = shadow + textureSampleCompare(
                dirShadowMap, 
                shadowSampler,
                shadowPos.xy + offset, 
                shadowPos.z - 0.005  // apply a small bias to avoid acne
            );
        }
    }
    shadow = shadow / 9.0;

    dirBlinnPhong *= clamp(shadow + (1-inRange),0,1);

#endif

    lightResult += dirBlinnPhong;

    for(var i = 0; i < 3; i++){
        lightResult += blinnphongPointLight(pointlightData[i], normal, viewDir, in.worldPosition.xyz);
    }

    finalColor = color.rgb * lightResult;
#else
    finalColor = color.rgb;
#endif

#if HAS_ALBEDO_MAP
    finalColor *= textureSample(albedoMap, defaultSampler, in.uv).rgb;
#endif

    // gamma correction
    // finalColor = finalColor / (finalColor + vec3<f32>(1.0));
    // finalColor = pow(finalColor, vec3<f32>(1.0/2.2));  

    // var shadowTest = textureSample(
    //     dirShadowMap, 
    //     defaultSampler,
    //     shadowPos.xy, 
    // );

    // if(shadowTest > shadowPos.z) {
    //    return vec4<f32>(1, 0, 0,1);

    // }
    // else{
    //     return vec4<f32>(0, 0, 0,1);

    // }

    // var shadowTest = textureSample(
    //     dirShadowMap, 
    //     defaultSampler,
    //     in.uv, 
    // );
    // return vec4<f32>(shadowTest, 0, 0,1);
    
   return vec4<f32>(finalColor,1);
}