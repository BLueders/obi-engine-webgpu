@group(1) @binding(0) var<uniform> color : vec4<f32>;

// Texture bind group
@group(1) @binding(1) var mySampler : sampler;
@group(1) @binding(2) var albedo : texture_2d<f32>;

@fragment
fn main(@location(0) uv: vec2<f32>,
        @location(1) worldPosition: vec4<f32>,
        @location(2) t: vec3<f32>,
        @location(3) b: vec3<f32>,
        @location(4) n: vec3<f32>,
        @location(5) camPos: vec3<f32>
        ) -> @location(0) vec4<f32> 
{
    var finalColor = color * textureSample(albedo, mySampler, uv);

    return finalColor;
}