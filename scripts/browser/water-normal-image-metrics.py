"""Measure held pixel/vertex normal PNG pairs without editing images; requires Pillow.

python3 scripts/browser/water-normal-image-metrics.py --report /path/report.json --out /path/image-metrics.json
The lower-two-thirds crop is a water-view proxy; highlights include white foam and other unchanged bright objects.
"""
import argparse
import json
import math
from pathlib import Path
from PIL import Image, ImageChops


def metrics(first, second):
    width, height = first.size
    count = width * height
    pixels_a = list(getattr(first, "get_flattened_data", first.getdata)())
    pixels_b = list(getattr(second, "get_flattened_data", second.getdata)())
    histogram = [0] * 256
    total = 0
    luminance_a, luminance_b = [], []
    highlight = {threshold: {"first": {"count": 0, "x": 0, "y": 0}, "second": {"count": 0, "x": 0, "y": 0}, "changedMembership": 0} for threshold in [200, 230, 245]}
    for n, (a, b) in enumerate(zip(pixels_a, pixels_b)):
        delta = [abs(a[channel] - b[channel]) for channel in range(3)]
        histogram[max(delta)] += 1
        total += sum(delta)
        la = .2126 * a[0] + .7152 * a[1] + .0722 * a[2]
        lb = .2126 * b[0] + .7152 * b[1] + .0722 * b[2]
        luminance_a.append(la)
        luminance_b.append(lb)
        x, y = n % width, n // width
        for threshold, result in highlight.items():
            aa, bb = la >= threshold, lb >= threshold
            result["changedMembership"] += aa != bb
            for label, bright in [("first", aa), ("second", bb)]:
                if bright:
                    result[label]["count"] += 1
                    result[label]["x"] += x
                    result[label]["y"] += y
    cumulative = 0
    p95 = 0
    for value, amount in enumerate(histogram):
        cumulative += amount
        if cumulative >= .95 * count:
            p95 = value
            break
    for threshold, result in highlight.items():
        for label in ["first", "second"]:
            summary = result[label]
            total_bright = summary["count"]
            summary["fraction"] = total_bright / count
            summary["centroidPixels"] = [summary.pop("x") / total_bright, summary.pop("y") / total_bright] if total_bright else None
            if not total_bright:
                summary.pop("x")
                summary.pop("y")
        p, q = result["first"]["centroidPixels"], result["second"]["centroidPixels"]
        result["centroidShiftPixels"] = math.hypot(p[0] - q[0], p[1] - q[1]) if p and q else None
        result["fractionChange"] = result["second"]["fraction"] - result["first"]["fraction"]
    gradient_a, gradient_b, gradient_delta, edges = 0, 0, 0, 0
    for y in range(height):
        for x in range(width):
            n = y * width + x
            for other in [n + 1 if x + 1 < width else None, n + width if y + 1 < height else None]:
                if other is None:
                    continue
                ga = abs(luminance_a[n] - luminance_a[other])
                gb = abs(luminance_b[n] - luminance_b[other])
                gradient_a += ga
                gradient_b += gb
                gradient_delta += abs(ga - gb)
                edges += 1
    return {"size": [width, height], "changedPixels": count - histogram[0], "changedPercent": 100 * (count - histogram[0]) / count,
            "meanAbsoluteChannelDelta": total / (count * 3), "p95MaxPixelDelta": p95,
            "maxChannelDelta": max(i for i, amount in enumerate(histogram) if amount),
            "pixelsAbove2": sum(histogram[3:]), "pixelsAbove5": sum(histogram[6:]),
            "meanLuminance": {"pixel": sum(luminance_a) / count, "vertex": sum(luminance_b) / count},
            "meanNeighborLuminanceGradient": {"pixel": gradient_a / edges, "vertex": gradient_b / edges, "absoluteDifference": gradient_delta / edges},
            "brightLuminanceProxy": highlight,
            "differenceBounds": ImageChops.difference(first, second).getbbox()}


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--report", required=True)
parser.add_argument("--out", required=True)
args = parser.parse_args()
report = json.loads(Path(args.report).read_text())
result = {"schema": 1, "report": args.report, "units": "8-bit RGB/luminance values; brightness thresholds 200/230/245",
          "limitation": "Lower-two-thirds crop is a water-view proxy, not semantic water segmentation. Bright-pixel area/centroid includes unchanged white foam, spray and shore; these are measurable shading differences, not isolated specular-light energy.", "pairs": []}
for pair in report["pairs"]:
    frames = {frame["mode"]: frame for frame in pair["frames"]}
    with Image.open(frames["pixel"]["path"]) as image:
        first = image.convert("RGB")
    with Image.open(frames["vertex"]["path"]) as image:
        second = image.convert("RGB")
    with Image.open(frames["pixel-repeat"]["path"]) as image:
        repeat = image.convert("RGB")
    if first.size != second.size or first.size != repeat.size:
        raise SystemExit("Paired dimensions differ")
    crop = (0, first.height // 3, first.width, first.height)
    item = {"at": pair["at"], "seaTime": frames["pixel"]["signature"]["seaTime"],
            "pixelRepeatIdenticalPixels": ImageChops.difference(first, repeat).getbbox() is None,
            "fullFrame": metrics(first, second), "waterCrop": {"bounds": crop, **metrics(first.crop(crop), second.crop(crop))}}
    result["pairs"].append(item)
Path(args.out).write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({"out": args.out, "pairs": [{"at": p["at"], "repeatIdentical": p["pixelRepeatIdenticalPixels"],
      "waterMeanAbsoluteChannelDelta": p["waterCrop"]["meanAbsoluteChannelDelta"], "waterP95MaxPixelDelta": p["waterCrop"]["p95MaxPixelDelta"]} for p in result["pairs"]]}))
