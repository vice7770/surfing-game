import { AlwaysStencilFunc, EqualStencilFunc, KeepStencilOp, ReplaceStencilOp, type Material } from 'three';

/** Ordinary opaque surfaces keep their ordering. Only the water repair runs after them. */
export const BARREL_FALLBACK_ORDER = 1;

/** Mark a surviving original surface; fragment discard and depth failure leave the bit untouched. */
export function configureBarrelCoverage(material: Material): void {
  material.stencilWrite = false;
  material.stencilRef = 1;
  material.stencilFunc = AlwaysStencilFunc;
  material.stencilFuncMask = 1;
  material.stencilWriteMask = 1;
  material.stencilFail = KeepStencilOp;
  material.stencilZFail = KeepStencilOp;
  material.stencilZPass = ReplaceStencilOp;
}

/** Repair only an uncovered screen sample. Original water side, colour and depth state are retained. */
export function configureBarrelFallback(material: Material): void {
  material.stencilWrite = true;
  material.stencilRef = 0;
  material.stencilFunc = EqualStencilFunc;
  material.stencilFuncMask = 1;
  material.stencilWriteMask = 0;
  material.stencilFail = KeepStencilOp;
  material.stencilZFail = KeepStencilOp;
  material.stencilZPass = KeepStencilOp;
}
