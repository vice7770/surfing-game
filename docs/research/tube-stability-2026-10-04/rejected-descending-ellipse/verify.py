#!/usr/bin/env python3
"""Check archived bytes and stored rejection receipts; never rerun geometry."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path


def receipt(data):
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def decode(path, encoding):
    data = path.read_bytes()
    return gzip.decompress(data) if encoding == "gzip" else data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--original", action="store_true", help="Also hash original scratch/input files without executing them")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    manifest = json.loads((root / "manifest.json").read_text())
    inputs = json.loads((root / "input-references.json").read_text())
    for name, expected in manifest["files"].items():
        path = root / name
        require(receipt(path.read_bytes()) == expected["transportReceipt"], "archive bytes: " + name)
        if "originalReceipt" in expected:
            require(receipt(decode(path, expected["encoding"])) == expected["originalReceipt"], "decoded original bytes: " + name)
    for name, expected in inputs["archivedReferences"].items():
        path = root / name
        require(receipt(path.read_bytes()) == expected["transportReceipt"], "reference bytes: " + name)
        require(receipt(decode(path, expected["encoding"])) == expected["decodedReceipt"], "decoded reference bytes: " + name)
    repo = root.parents[3]
    for asset in inputs["caseAssets"]:
        expected = asset["originalAssetReceipt"]
        require(receipt((repo / asset["repositoryRelative"]).read_bytes()) == {key: expected[key] for key in ("bytes", "sha256")}, "asset bytes: " + asset["id"])
    index = json.loads(gzip.decompress((root / inputs["eligibleMetadataArchive"]).read_bytes()))
    require(index["originalEligibleInput"]["sha256"] == inputs["originalEligibleCasesReceipt"]["sha256"], "same original eligible input reference")

    report = json.loads(gzip.decompress((root / "report.json.gz").read_bytes()))
    summary = json.loads(gzip.decompress((root / "summary.json.gz").read_bytes()))
    review = json.loads((root / "review.json").read_text())
    failures = json.loads(gzip.decompress((root / "failure-profiles.json.gz").read_bytes()))
    require(report["complete"] and summary["outcome"] == report["outcome"], "complete stored report/summary consistency")
    require(report["outcome"]["allFrames"]["samples"] == 1224 and report["outcome"]["allFrames"]["invalid"] == len(report["invalidFrames"]) == 157, "recorded all-frame domain failures")
    require(report["outcome"]["allFrames"]["cleanBecomesCrossed"] == 4 and len(review["crossingFrameDetails"]) == len(failures) == 4, "recorded crossed frames")
    interpolation = report["outcome"]["allAdjacentF32Interpolation"]
    require((interpolation["samples"], interpolation["invalid"], interpolation["valid"], interpolation["cleanBecomesCrossed"]) == (3648, 498, 3150, 11), "recorded interpolation failures")
    require(review["allInvalidAreNegativeFloorBasisDepth"] and all(row["pairsBeforeF32Rounding"] > 0 for row in review["crossingFrameDetails"]), "recorded failure attribution")
    require(report["outcome"]["allCapturedCrouchedCorridorPass"] and not report["outcome"]["allCapturedGenerousCorridorPass"], "recorded local target distinction")
    require(report["productionAtStart"] == report["productionAtEnd"] and len(report["productionAtStart"]) == 12, "recorded unchanged production hashes")
    old = json.loads((root / "original-manifest.json").read_text())
    require(old["result"] == "rejected" and not old["productionEdited"] and not old["recipeChangedAfterEvaluation"], "original rejection manifest")
    for expected in old["files"]:
        name = Path(expected["file"]).name
        archived = "original-README.md.gz" if name == "README.md" else "report.json.gz" if name == "report.json" else name + ".gz" if name in ("summary.json", "failure-profiles.json") else name
        encoding = "gzip" if archived.endswith(".gz") and name != "report.json.gz" else "identity"
        require(receipt(decode(root / archived, encoding)) == {key: expected[key] for key in ("bytes", "sha256")}, "original manifest receipt: " + name)
    require((root / "captured-profile-comparison.png").read_bytes().startswith(b"\x89PNG\r\n\x1a\n"), "original numeric chart PNG")

    if args.original:
        inventory = json.loads((root / "scratch-inventory.json").read_text())
        original = Path(inventory["root"])
        actual = {str(path.relative_to(original)): receipt(path.read_bytes()) for path in sorted(original.rglob("*")) if path.is_file()}
        require(actual == inventory["files"], "original scratch complete byte inventory")
        for expected in manifest["files"].values():
            if "original" in expected:
                require(receipt(Path(expected["original"]).read_bytes()) == expected["originalReceipt"], "original artifact bytes")
                if "compressedOriginal" in expected:
                    require(receipt(Path(expected["compressedOriginal"]).read_bytes()) == expected["transportReceipt"], "original report transport bytes")
        for expected in inputs["sourceFilesExactlyAsRecorded"]:
            require(receipt(Path(expected["file"]).read_bytes()) == {key: expected[key] for key in ("bytes", "sha256")}, "original input bytes")
    print(json.dumps({"scope": "Byte/gzip preservation and stored rejection receipts only; no native/numerical rerun or acceptance claim", "archiveFilesVerified": len(manifest["files"]), "priorReferencesVerified": len(inputs["archivedReferences"]), "caseAssetsVerified": len(inputs["caseAssets"]), "originalScratchVerified": args.original, "recordedInvalidFrames": 157, "recordedNewlyCrossedFrames": 4, "recordedNewlyCrossedInterpolationSamples": 11, "candidateAdopted": False}, indent=2))


if __name__ == "__main__":
    main()
