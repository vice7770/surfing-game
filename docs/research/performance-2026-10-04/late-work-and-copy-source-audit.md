# Late work and copying: source audit · 2026-10-04

Source authority: `b0e003b8670c9d0be83bc9bb24c30b5382a54499`. These are read-only source conclusions using the retained full-writer FPS timeline. No new game import, simulation, profiler, browser or performance benchmark was run for this audit.

The late slowdown affects fixed-size work as well as phase-dependent work. Candidate two-second-bin medians at wall times 70 and 88 seconds change: packing 1.1→1.7 ms, unpacking 0.8→1.2, snapshot fields 1.5→2.6, fronts 1.6→2.9, foam 2.0→3.2 and aeration 1.5→2.5. Map medians at those endpoints are 6.0→5.9 ms; device-substep medians are two at both. These independent bin statistics do not identify a cause, represent matched material epochs, or permit stage-quantile addition/subtraction. No late cell/front/branch counts were recorded.

## Fixed storage and variable branches

The GPU grid remains 116,000 cells. Three ordinary upload planes and nine readback planes have fixed lengths. Snapshot scratch storage, nine-plane unpacking and shared advection storage remain fixed after initialization. Readback already has one staging buffer and one whole-buffer map; nine subarray views are not nine separate maps.

A changed plunge version adds one HOLD-plane conversion/upload: 116,000 F64 reads and 464,000 F32 bytes. A changed layout version performs the larger layout refresh. The recorded FPS data lacks version/upload counters, so this branch cannot be assigned as the late cause.

Foam's positive-strength cells evaluate bore dissipation; aeration's positive-air cells perform exponential decay. Front tracking and matching allocate collections proportional to current samples/tracks/points. A new crash point high-water mark reallocates seven arrays, but subsequent fills use the current count rather than retained capacity. These are source-supported variable mechanisms; none has a measured late growth trajectory here.

## Prefetch already defers committed writes

The accepted production prefetch does **not** save and restore thirteen F64 planes on every speculative step. Ordinary steady preparation converts H/QX/QZ into a reusable 1,392,000-byte F32 upload. The GPU copies nine output planes into the existing 4,176,000-byte staging buffer. Commit widens those nine planes once into existing F64 targets, writing 8,352,000 bytes. Prepare leaves committed arrays, clocks and plunge ownership intact.

The thirteen-plane description is three ordinary uploads plus ten layout planes; the layout planes are uploaded on layout invalidation, not every ordinary frame. Steady prepare/commit creates views and small token/parameter objects, without new payload arrays. All nine outputs have CPU continuation consumers. A finer distinction between a canonical discard and a true layout change could avoid some discard-only uploads, but would not improve ordinary uninterrupted stepping. No prototype or timing claim follows this audit.

## Foam coverage and the physical boundary

Dense/residual foam coverage is cosmetic. Fine breaking-cell/dissipation data drives `aerateBores`, air and turbulence, then hull/body density and eddies. Fine source cells also control particle spawn order and RNG. Reducing FoamField as a whole would therefore change physical and material inputs.

A narrower coarse-coverage design could retain the original fine bore/source sweep and fine departure/stencil used by aeration, reducing only four coverage arrays. It would still require nonuniform row-area handling, dry gating, one-fine-column window shifts and public array/export compatibility. The previously rejected coarse prototype slowed the complete path by 0.225 ms. A distinct design retaining the original air lookup remains source-feasible, but has no established useful saving or similar-visual/continuation proof. No additional prototype was prepared.

## The half-cell-count grid was already tested

The retained [dx2/dx4 quality trial](../performance-2026-10-03/dx24-quality.md) already held fineSpacing=1 and all 725 stretched cross-shore rows, changing only alongshore resolution from 160 to 80 cells. Its 116,000→58,000 reduction was real. It delayed the first material launch by 3.5 seconds and had no drawable tube at five seconds. The title's “uniform dx4” refers to uniform alongshore spacing, not four-metre nearshore rows. Current renderSpacing=2 does not remove that water/front event loss. No repeat or new prototype followed this source clarification.

The separate [interleaved spray candidate](spray-interleaved-rejected/README.md) was measured and rejected for its small complete-update saving. Its result is not a cause for late worker slowdown or a sustained 60 Hz result.
