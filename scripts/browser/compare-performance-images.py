"""Compare two benchmark PNGs without changing them; requires Pillow.

python3 scripts/browser/compare-performance-images.py before.png after.png --out=diff.json
"""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops


def metrics(first, second):
    difference = ImageChops.difference(first, second)
    histogram = [0] * 256
    channel_total = 0
    for pixel in getattr(difference, "get_flattened_data", difference.getdata)():
        histogram[max(pixel)] += 1
        channel_total += sum(pixel)
    pixels = first.width * first.height
    changed = pixels - histogram[0]
    cumulative = 0
    p95 = 0
    for value, count in enumerate(histogram):
        cumulative += count
        if cumulative >= pixels * 0.95:
            p95 = value
            break
    return {
        "size": list(first.size),
        "changedPixels": changed,
        "changedPercent": round(changed * 100 / pixels, 6),
        "pixelsAbove1": sum(histogram[2:]),
        "pixelsAbove2": sum(histogram[3:]),
        "pixelsAbove5": sum(histogram[6:]),
        "maxChannelDelta": max(high for _, high in difference.getextrema()),
        "meanAbsoluteChannelDelta": round(channel_total / (pixels * 3), 8),
        "p95MaxPixelDelta": p95,
        "differenceBounds": difference.getbbox(),
    }


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("before")
parser.add_argument("after")
parser.add_argument("--out")
args = parser.parse_args()
with Image.open(args.before) as image:
    before = image.convert("RGB")
with Image.open(args.after) as image:
    after = image.convert("RGB")
if before.size != after.size:
    raise SystemExit(f"Sizes differ: {before.size} and {after.size}")
crop = (0, before.height // 3, before.width, before.height)
result = {
    "before": args.before,
    "after": args.after,
    "units": "8-bit RGB channel values (0–255)",
    "fullFrame": metrics(before, after),
    "waterCrop": {"bounds": crop, **metrics(before.crop(crop), after.crop(crop))},
}
rendered = json.dumps(result, indent=2) + "\n"
if args.out:
    Path(args.out).write_text(rendered)
print(rendered, end="")
