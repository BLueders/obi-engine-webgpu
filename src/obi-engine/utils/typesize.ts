let TypeSize = {
    'float32': 1 * Float32Array.BYTES_PER_ELEMENT,
    'float32x2': 2 * Float32Array.BYTES_PER_ELEMENT,
    "float32x3": 3 * Float32Array.BYTES_PER_ELEMENT,
    'float32x4': 4 * Float32Array.BYTES_PER_ELEMENT,
    'mat2': 4 * Float32Array.BYTES_PER_ELEMENT,
    'mat3': 12 * Float32Array.BYTES_PER_ELEMENT, /* use 4*3 */
    'mat4': 16 * Float32Array.BYTES_PER_ELEMENT
  };
  export default TypeSize;