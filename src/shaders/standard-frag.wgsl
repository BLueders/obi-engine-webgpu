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
@group(2) @binding(1) var<uniform> pointlightData : array<PointLightData,3>; // max 3 pointlights

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

    lightResult += blinnphongDirLight(dirDir.xyz, dirColor.rgb, normal, viewDir);

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

    return vec4<f32>(finalColor,1);
}