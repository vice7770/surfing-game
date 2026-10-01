# Option B: blended curl library

**How it works.** A0 (H0/h0) varies along the crest: 0.20 at x=0, 0.45 at x=35, 0.30 at x=60. Each 0.5 m slice has its own clock, τ = t − tThrow(x), with tThrow(x) = 1 + (x−5)/11 s. A slice blends the two stored Basilisk cases that bracket its A0 (a20/a30/a45). Before the throw it uses raw τ; after it, normalised τ (τ/touchdown), so throw and touchdown line up. The blend is point by point on the shared landmarks, scaled by h0 = 7 m; 3,171 blend samples checked for self-crossings, none found. Slices are lofted into one surface, blended into the height field at the ends, faded over 0.3 s after touchdown into a foam bore, with spray from each landing.

**Computed vs shaped.** Curl shapes are stored Basilisk runs (physically computed offline). The blend rule, the A0(x) profile, the analytic sech² height field and the break line z = −13 + x/20 are hand-set. Lip thickness = distance across polyline 33–87, ramped in as the lip separates.

**Cost (provisional).** Generator 8.7 ms/frame in node (median; p95 26 ms), mostly mesh building; the blend alone 1.4 ms for 121 slices. WebGPU on an M4 Pro: under 0.2 ms (guess).

**A real library.** About 40–70 offline 2D cases (A0 × 5–6, slope × 3–4, period or flat depth × 2–3), 7–11 MB in all.

**Looks right.** The tube changes size and shape along the line (B-slices.mp4): small slices spill-curl, big ones plunge with an open tube, blending is smooth with no pops.

**Looks wrong.** Broken water is a flat bore with no volume; the collapse reads as a grey hump; the curl's plan-view crest is oblique; the pre-break crest is the stored shape, not a real shoaling simulation.
