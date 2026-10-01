# D: displaced (Lagrangian) water surface

**How it works.** One mesh, and every vertex is a surface parcel (241 x-columns × 491 rows). Before breaking, parcels ride a shoaling solitary wave (Green's law, c=√(g(h+A)), steepened front) and move sideways along it at the Bernoulli speed u = c − √(c²−2gη)·cosθ. At onset, the crest's front-top launches ballistically: the tip leaves at 1.3c (Erinin 2023), and the edges blend back into the field. The connected mesh overturns into a lip and a cavity. Lip parcels that fall back in merge and get foam plus spray. The peel is an 11 m/s time shift, so the crest is oblique. A pre-pass adds labels where the mesh stretches. `thick` is a ray cast along the inward normal against the column (50 if nothing is hit).

**Physical vs tuned.** Physical: the shoaling, celerity, Bernoulli kinematics, ballistic lip and Lagrangian foam. Tuned: front steepening and toe, the crest boost to 0.85c, the launch weights and throw, the lip gravity of 0.65 g (fit to Basilisk) and the bore decay. The break line sits at z=−12, too deep for this bed.

**Cost (provisional).** Node, 1 thread, 118k verts: 358 ms/frame for the sim (10 substeps) plus 135 ms for `thick`. Every vertex is independent. My WebGPU guess on an M4 Pro is 1–2 ms.

**Vs Basilisk** (`D-vs-basilisk.mp4`). The lip path and touchdown time match within about 0.1 s and 0.5 m. My crest is 0.7 m lower, my face is about 65° instead of vertical, and my cavity is smaller and my lip flatter.

**Failure modes.** A staircase across columns on the oblique crest. Hidden internal folds where merged parcels overlap. No splash-up. The bore stays a smooth, foam-covered step that reads as a grey wall in the channel view. Tangling depends on the tuning.
