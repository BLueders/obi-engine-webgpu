import Shader from "../shader";

export enum RenderPassType {
    Opaque_Z_only,
    Opaque_Shadow,
    Opaque_Base,
    Opaque_Ambient_only,
    Opaque_Directional_Light,
    Opaque_Spot_Light,
    Opaque_Point_Light,
    Opaque_Point_Light_NoShadows,
    Opaque_Directional_Light_NoShadows,
    Opaque_Spot_Light_NoShadows,
    Alpha,
}
