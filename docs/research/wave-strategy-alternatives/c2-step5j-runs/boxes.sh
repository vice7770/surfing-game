#!/bin/sh
# C2 step 5j: step 5h's own box statistics (sRGB CODE VALUES, not radiance) over the three legs, with step 5h's
# own script unchanged, so these rows sit beside c2-step5h-runs/broken-section.txt and c2-step5i-runs/boxes-srgb.txt.
#   sh boxes.sh <dir-with-off/ on/ bubbles/ ref.png>
R="$1"
S="$(cd "$(dirname "$0")/../c2-step5h-runs" && pwd)"
echo "# C2 step 5j: step 5h's foam-relief.py (sRGB CODE VALUES, tile 8) on the three legs and the photograph."
echo
for leg in off on bubbles; do
  python3 -I "$S/foam-relief.py" "$R/$leg/side.png"      660 390 1240 500 "[5j $leg] broken mass"
done
python3 -I "$S/foam-relief.py" "$R/ref.png"              16 300 440 540   "[photo] broken foam"
echo
for leg in off on bubbles; do
  python3 -I "$S/foam-relief.py" "$R/$leg/side.png"      700 600 1200 700 "[5j $leg] flat foreground"
done
python3 -I "$S/foam-relief.py" "$R/ref.png"              300 600 900 700  "[photo] glassy foreground"
echo
for leg in off on bubbles; do
  python3 -I "$S/foam-relief.py" "$R/$leg/side.png"      40 430 420 620   "[5j $leg] clean teal face"
done
python3 -I "$S/foam-relief.py" "$R/ref.png"              700 400 1200 500 "[photo] clean teal face"
echo
for leg in off on bubbles; do
  python3 -I "$S/foam-relief.py" "$R/$leg/bore-face.png" 700 320 1240 520 "[5j $leg] bore-face broken"
done
