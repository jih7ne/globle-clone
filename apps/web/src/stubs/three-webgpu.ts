import { unused } from './unused';

// Plain functions: three-globe calls these with `new`, which throws all the same.
export function WebGPURenderer(): never {
  return unused('three/webgpu');
}

export function StorageInstancedBufferAttribute(): never {
  return unused('three/webgpu');
}
