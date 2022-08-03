struct BaseLightData {
    ambientColor: vec4<f32>,
    directionalDir: vec4<f32>,
    directionalColor: vec4<f32>
}

struct PointLightData {
    position:vec4<f32>,
    color:vec4<f32>,
    range: f32,
    intensity: f32,
    filler1: f32,   // need to be a multible of 4 f32s
    filler2: f32
}

struct NormalInfo {
    ng : vec3<f32>,   // Geometry normal
    t : vec3<f32>,    // Geometry tangent
    b : vec3<f32>,    // Geometry bitangent
    n : vec3<f32>,    // Shading normal
    ntex : vec3<f32>, // Normal from texture, scaling is accounted for.
};

// Get normal, tangent and bitangent vectors.
fn getNormalInfo(v: VertexOut) -> NormalInfo
{
    // Trivial TBN computation, present as vertex attribute.
    // Normalize as attributes are linearly interpolated.
    var t = normalize(v.tangent);
    var b = normalize(v.bitangent);
    var ng = normalize(v.normal);

    // Compute normals:
    var info : NormalInfo;
    info.ng = ng;
#if HAS_NORMAL_MAP
    info.ntex = textureSample(normalMap, defaultSampler, v.uv).rgb * 2.0 - vec3<f32>(1.0);
    //info.ntex *= vec3<f32>(u_NormalScale, u_NormalScale, 1.0);
    info.ntex = normalize(info.ntex);
    info.n = normalize(mat3x3<f32>(t, b, ng) * info.ntex);
#else
    info.n = ng;
#endif
    info.t = t;
    info.b = b;
    return info;
};

fn blinnphongDirLight(dir:vec3<f32>, color:vec3<f32>, normal:vec3<f32>, viewDir:vec3<f32>) -> vec3<f32> 
{
    // Directional Light diffuse
    var diffuse = max(dot(normalize(dir), normal), 0.0) * color;

    var reflectDir = reflect(-dir.xyz, normal);  
    var spec = pow(max(dot(viewDir, reflectDir), 0.0), 32);
    var specular = spec * color;  

    return diffuse + specular;
}

fn blinnphongPointLight(data: PointLightData, normal:vec3<f32>, viewDir:vec3<f32>, worldPosition:vec3<f32>) -> vec3<f32> 
{
    var pointPosition = data.position.xyz;
    var pointColor = data.color.rgb;
    var pointRadius = data.range;
    var pointIntensity = data.intensity;
    var L = pointPosition - worldPosition.xyz;
    var distance = length(L);
    if(distance < pointRadius){
        
        var diffuse = max(dot(normalize(L), normal), 0.0) * pointColor.rgb;

        var reflectDir = reflect(normalize(-L), normal);  
        var spec = pow(max(dot(viewDir, reflectDir), 0.0), 32);
        var specular = spec * pointColor.rgb;


        var distanceFactor: f32 = pow(1.0 - distance / pointRadius, 2.0);
        return (diffuse* pointIntensity + specular) * distanceFactor;
    }  

    return vec3<f32>(0);
}

