#import utils.wgsl
#import lighting.wgsl

@group(0) @binding(4) var<uniform> camPos : vec3<f32>;

@group(1) @binding(0) var<uniform> color : vec4<f32>;

// Texture bind group
@group(1) @binding(1) var defaultSampler : sampler;
@group(1) @binding(2) var albedoMap : texture_2d<f32>;
@group(1) @binding(3) var normalMap : texture_2d<f32>;
@group(1) @binding(4) var emissiveMap : texture_2d<f32>;

// Light bind group
@group(2) @binding(0) var<uniform> ambientDirData : BaseLightData;
#if RECEIVES_SHADOWS
    @group(2) @binding(1) var dirShadowMap: texture_depth_2d;
    @group(2) @binding(2) var shadowSampler: sampler_comparison;
    @group(2) @binding(3) var<uniform> dirLightMatrix: mat4x4<f32>;
#endif
@group(2) @binding(4) var<uniform> pointlightData : array<PointLightData,3>; // max 3 pointlights

@fragment
fn main(in: VertexOut) -> @location(0) vec4<f32> {

    var normalInfo = getNormalInfo(in);

    var normal = normalInfo.n;
    var finalColor : vec3<f32>;

#if BLINNPHONG_LIGHTING
    var ambient = ambientDirData.ambientColor;
    var dirDir = ambientDirData.directionalDir;
    var dirColor = ambientDirData.directionalColor;

    var viewDir = normalize(camPos - in.worldPosition.xyz);

    var lightResult = vec3(0.0, 0.0, 0.0);
    // ambient
    lightResult += ambient.rgb * ambient.a; // alpha = intensity

    var dirBlinnPhong = blinnphongDirLight(dirDir.xyz, dirColor.rgb, normal, viewDir);

#if RECEIVES_SHADOWS

    // var inRange = in.shadowPos.x >= 0.0 &&
    //               in.shadowPos.x <= 1.0 &&
    //               in.shadowPos.y >= 0.0 &&
    //               in.shadowPos.y <= 1.0;
   // if(inRange){
        var shadow = textureSampleCompare(
            dirShadowMap, 
            shadowSampler,
            in.shadowPos.xy, 
            in.shadowPos.z - 0.005  // apply a small bias to avoid acne
        );
        dirBlinnPhong *= shadow;
 //   }

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
    //     in.uv, 
    // ) * lightResult;
    // return vec4<f32>(shadowTest,1);

   return vec4<f32>(finalColor,1);
}