@group(0) @binding(4) var<uniform> camPos : vec3<f32>;

@group(1) @binding(0) var<uniform> color : vec4<f32>;

// Texture bind group
@group(1) @binding(1) var mySampler : sampler;
@group(1) @binding(2) var albedoMap : texture_2d<f32>;
@group(1) @binding(3) var normalMap : texture_2d<f32>;
@group(1) @binding(4) var emissiveMap : texture_2d<f32>;


// Light bind group
@group(2) @binding(0) var<uniform> ambientDirData : array<vec4<f32>, 3>;
// 0 = ambient light color [r, g, b, intensity]
// 1 = directional light dir
// 2 = directional light color

@group(2) @binding(1) var<uniform> pointlightData : array<array<vec4<f32>, 3>,3>; // max 3 pointlights
// 0 = point light position
// 1 = point light color
// 2 = point light [range, intensity, x, x]

@fragment
fn main(@location(0) uv: vec2<f32>,
        @location(1) worldPosition: vec4<f32>,
        @location(2) t: vec3<f32>,
        @location(3) b: vec3<f32>,
        @location(4) n: vec3<f32>
        ) -> @location(0) vec4<f32> 
{

    var normal = normalize(n);
#if BLINNPHONG_LIGHTING
    var ambient = ambientDirData[0];
    var dirDir = ambientDirData[1];
    var dirColor = ambientDirData[2];

    var lightResult = vec3(0.0, 0.0, 0.0);
    // ambient
    lightResult += ambient.rgb * ambient.a; // alpha = intensity

    // Directional Light diffuse
    var diffuse = max(dot(normalize(dirDir.xyz), normal), 0.0) * dirColor.rgb;

    // Directional Light specular
    const specularStrength = 1;

    var viewDir = normalize(camPos - worldPosition.xyz);
    var reflectDir = reflect(-dirDir.xyz, normal);  
    var spec = pow(max(dot(viewDir, reflectDir), 0.0), 32);
    var specular = specularStrength * spec * dirColor.rgb;  

    lightResult += diffuse + specular;

    for(var i = 0; i < 3; i++){
        var pointPosition: vec3<f32> = pointlightData[i][0].xyz;
        var pointColor: vec3<f32> = pointlightData[i][1].rgb;
        var pointRadius: f32 = pointlightData[i][2].x;
        var pointIntensity: f32 = pointlightData[i][2].y;
        var L = pointPosition - worldPosition.xyz;
        var distance = length(L);
        if(distance < pointRadius){
            
            var diffuse = max(dot(normalize(L), normal), 0.0) * pointColor.rgb;

            var reflectDir = reflect(normalize(-L), normal);  
            var spec = pow(max(dot(viewDir, reflectDir), 0.0), 32);
            var specular = specularStrength * spec * pointColor.rgb;


            var distanceFactor: f32 = pow(1.0 - distance / pointRadius, 2.0);
            lightResult += (diffuse* pointIntensity + specular) * distanceFactor;


            

            // // Point light specular
  

            // var distanceFactor: f32 = pow(1.0 - distance / pointRadius, 2.0);

            // lightResult += (diffuse + specular) * pointIntensity * distanceFactor;


        }
    }

    var finalColor = color.rgb * lightResult;
#else
    var finalColor = color.rgb;
#endif

#if HAS_ALBEDO
    finalColor *= textureSample(albedoMap, mySampler, uv).rgb;
#endif

    // gamma correction
    // finalColor = finalColor / (finalColor + vec3<f32>(1.0));
    // finalColor = pow(finalColor, vec3<f32>(1.0/2.2));  

    return vec4<f32>(finalColor,1);
}