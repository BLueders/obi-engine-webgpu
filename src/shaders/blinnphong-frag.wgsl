@group(1) @binding(0) var<uniform> color : vec4<f32>;

// Texture bind group
@group(1) @binding(1) var mySampler : sampler;
@group(1) @binding(2) var albedo : texture_2d<f32>;

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
        @location(4) n: vec3<f32>,
        @location(5) camPos: vec3<f32>
        ) -> @location(0) vec4<f32> 
{
    var temp = ambientDirData[0];
    var temp2 = pointlightData[0];

    var ambient = ambientDirData[0];
    var dirDir = ambientDirData[1];
    var dirColor = ambientDirData[2];

    var lightResult = vec3(0.0, 0.0, 0.0);
    // ambient
    lightResult += ambient.rgb * ambient.a; // alpha = intensity
    // Directional Light
    var diffuse: f32 = max(dot(normalize(dirDir.xyz), n), 0.0);
    lightResult += dirColor.rgb * diffuse;

    for(var i = 0; i < 3; i++){
        var pointPosition: vec3<f32> = pointlightData[i][0].xyz;
        var pointColor: vec3<f32> = pointlightData[i][1].rgb;
        var pointRadius: f32 = pointlightData[i][2].x;
        var pointIntensity: f32 = pointlightData[i][2].y;
        var L = pointPosition - worldPosition.xyz;
        var distance = length(L);
        if(distance < pointRadius){
            var diffuse: f32 = max(dot(normalize(L), n), 0.0);
            var distanceFactor: f32 = pow(1.0 - distance / pointRadius, 2.0);
            lightResult += pointColor * pointIntensity * diffuse * distanceFactor;
        }
    }

    var finalColor = color * vec4<f32>(lightResult, 1);

    finalColor *= textureSample(albedo, mySampler, uv);

    return finalColor;
}