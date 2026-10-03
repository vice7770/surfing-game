# Cost gate v2 intake correction

The v1 run stopped before collecting timings because a Node Buffer was incorrectly passed directly to the browser Uint8Array state decoder. Buffer.slice is a view; the decoder relies on Uint8Array.slice copying and aligning its array bytes. Raw retained SET1 breakingStrength is finite in all 116000 cells, range [0,1]. Preserve the v1 source/bundle/output/review under cost-v1-invalid; do not attribute its derived failure to historical GPU state.

V2 uses the identical fixture and raw hashes, copies raw bytes to a plain Uint8Array before invoking the untouched original decoder, and independently checks every decoded 32-bit word against the header's raw byte offsets. No sanitization, source replacement, solver stepping, or GPU work. Additional guard checks visual dense/residual input finiteness. The rest of the reviewed bounded pipeline/order/30-sample cost plan remains unchanged. Initial turbulence is zero under both original state-import paths; SET1 physical data remains captured Float32 poststate, not historical pre-degas Float64 values. Captured gated whitewater is unavailable, so explicitly use the same captured ungated Boussinesq strength under both fields and report this limit.

Await root review before rerunning.
