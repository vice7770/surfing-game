#!/usr/bin/env python3
"""Read-only archive/transport/receipt checks. No trial or game imports or reruns."""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path

A = Path(__file__).resolve().parent
REPO = A.parents[3]


def receipt(data):
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def pair(info):
    return {k: info[k] for k in ("bytes", "sha256")}


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def raw(name):
    data = (A / name).read_bytes()
    return gzip.decompress(data) if name.endswith(".gz") else data


def read_json(name):
    return json.loads(raw(name))


def inventory(root):
    result = {}
    for p in sorted(root.rglob("*")):
        name = str(p.relative_to(root))
        if p.is_symlink():
            result[name] = {"symlinkTarget": os.readlink(p)}
        elif p.is_file():
            result[name] = receipt(p.read_bytes())
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--original", action="store_true", help="Also read original scratch and immutable archived sources; never current live source.")
    args = parser.parse_args()
    manifest = read_json("manifest.json")
    names = {str(p.relative_to(A)) for p in A.rglob("*") if p.is_file() and p.name != "manifest.json"}
    check(names == set(manifest["files"]), "Archive inventory changed")
    for name, info in manifest["files"].items():
        data = (A / name).read_bytes()
        check(receipt(data) == info["storedReceipt"], "Stored bytes changed: " + name)
        if info["encoding"] == "gzip":
            check(receipt(gzip.decompress(data)) == info["decodedReceipt"], "Decoded bytes changed: " + name)
        if "originalReceipt" in info:
            check(receipt(raw(name)) == info["originalReceipt"], "Original byte transport mismatch: " + name)
        if "originalTransportReceipt" in info:
            check(receipt(data) == info["originalTransportReceipt"], "Original gzip transport changed: " + name)
        if args.original:
            for path in info.get("originalPaths", []):
                check(receipt(Path(path).read_bytes()) == info["originalReceipt"], "Original changed: " + path)
            for path in info.get("originalTransportPaths", []):
                check(receipt(Path(path).read_bytes()) == info["originalTransportReceipt"], "Original gzip changed: " + path)

    refs = read_json("input-references.json")
    check(refs["archivedReferences"] == manifest["priorArchivedReferences"], "Reference inventory mismatch")
    for name, info in refs["archivedReferences"].items():
        data = (A / name).read_bytes()
        decoded = gzip.decompress(data) if info["encoding"] == "gzip" else data
        check(receipt(data) == info["transportReceipt"] and receipt(decoded) == info["decodedReceipt"], "Referenced archive changed: " + name)
    check(len(refs["caseAssets"]) == 8 and sum(r["rawFrameCount"] for r in refs["caseAssets"]) == 1224, "Case frame receipt count mismatch")
    for asset in refs["caseAssets"]:
        check(receipt((REPO / asset["repositoryRelative"]).read_bytes()) == pair(asset["originalAssetReceipt"]), "Case asset bytes changed: " + asset["id"])

    original = read_json("original-manifest.json")
    check(original["complete"] and original["consumerReady"] is False and original["nativeAdopted"] is False and original["frozenRecipeUntuned"], "Original scope mismatch")
    for info in original["files"]:
        matches = [v for v in manifest["files"].values() if info["file"] in v.get("originalPaths", []) or info["file"] in v.get("originalTransportPaths", [])]
        check(len(matches) == 1, "Original manifest file missing: " + info["file"])
        v = matches[0]
        expected = v["originalTransportReceipt"] if info["file"] in v.get("originalTransportPaths", []) else v["originalReceipt"]
        check(expected == pair(info), "Original manifest receipt mismatch: " + info["file"])

    report = read_json("report.json.gz")
    summary = read_json("summary.json.gz")
    diagnostics = read_json("causal-diagnostics.json.gz")
    start = read_json("evaluation-start.json")
    baseline = read_json("immutable-source-baseline.json")
    parent = read_json("baseline/receipt.json")
    restoration = read_json("baseline/restoration.json")
    review = read_json("review.json")
    check(report["complete"] and report["outcome"] == summary["outcome"] == review["outcome"], "Outcome receipt mismatch")
    check(report["freeze"] == start["freeze"] and start["freeze"]["definedBeforeCandidateEvaluation"], "Frozen recipe chronology mismatch")
    for key, name in [("recipe", "recipe.md"), ("prototype", "prototype.py"), ("evaluator", "evaluate.py")]:
        check(receipt(raw(name)) == pair(start["freeze"][key]), "Frozen code changed: " + name)
    check(report["productionAtStart"] == report["productionAtEnd"] == start["productionAtStart"] and len(report["productionAtEnd"]) == 12, "Stored start/end source receipts mismatch")
    check(baseline["all12Match"] and baseline["originalEvaluationFinishedWithMatchingLiveStartAndEnd"] and len(baseline["files"]) == 12, "Immutable baseline scope mismatch")
    check(receipt(raw("baseline/receipt.json")) == pair(baseline["parentArchiveReceipt"]) and receipt(raw("baseline/restoration.json")) == pair(baseline["parentIntentionalRestorationReceipt"]), "Baseline parent receipts mismatch")
    check(hashlib.sha256(raw(refs["rejectedSourcePatch"])).hexdigest() == parent["patchSha256"] and parent["all12ArchivedSourcesEqualLive"] and restoration["all12LiveCandidateSourcesMatchedArchiveBeforeRestoration"], "Rejected patch/restoration provenance mismatch")
    parent_pins = {r["file"]: r["candidateSha256"] for r in parent["files"]}
    for item in baseline["files"]:
        check(pair(item["expected"]) == pair(item["immutableArchive"]) and item["sameBytesAndSha256"] and parent_pins[item["relativeFile"]] == item["expected"]["sha256"], "Immutable source pin mismatch")
    check(refs["sourceFilesExactlyAsRecorded"] == report["sourceFiles"], "Recorded input references mismatch")
    check([r["originalAssetReceipt"] for r in refs["caseAssets"]] == [r["asset"] for r in report["cases"]], "Case asset receipt mismatch")

    outcome = summary["outcome"]
    for key, attempted in [("captured", 5), ("allRawFrames", 1224), ("jointAfterRawF32Interpolation", 3648), ("pretransformThenF32InterpolationDiagnostic", 3648)]:
        r = outcome[key]
        check(r["attempted"] == r["valid"] == attempted and r["invalid"] == 0 and r["allValidFinite"] and r["allValidAnchorsRestExact"], "Finite/anchor receipt mismatch: " + key)
    check(outcome["allRawFrames"]["cleanBecomesCrossed"] == 0 and outcome["allRawFrames"]["pairCountIncrease"] == 1, "Raw crossing failure receipt mismatch")
    check(outcome["jointAfterRawF32Interpolation"]["cleanBecomesCrossed"] == 0 and outcome["jointAfterRawF32Interpolation"]["pairCountIncrease"] == 2 and outcome["jointAfterRawF32Interpolation"]["newPairSamples"] == 3, "After-query crossing receipt mismatch")
    check(outcome["pretransformThenF32InterpolationDiagnostic"]["cleanBecomesCrossed"] == 12 and outcome["pretransformThenF32InterpolationDiagnostic"]["pairCountIncrease"] == 16, "Pretransform crossing receipt mismatch")
    check(diagnostics["rawFramesWithNewOver90Turn"] == review["rawNewOver90TurnFrames"] == 27 and diagnostics["zeroReachCount"] == review["zeroReachFrames"] == 876 and diagnostics["allZeroReachOuterSurfacesChanged"], "Formation/zero-reach failure receipt mismatch")
    check(review["maximumZeroReachDisplacementH0"] == outcome["allRawFrameRanges"]["maximumZeroReachSurfaceDisplacement"] == 0.42244261570241953, "Zero-reach displacement receipt mismatch")
    check(len(summary["capturedRows"]) == 5 and sum(r["afterAir113"]["continuousWidth"] >= 1.25 for r in summary["capturedRows"]) == review["crouchedTargetPassed"] == 4 and sum(r["afterAir160"]["continuousWidth"] >= 1.25 for r in summary["capturedRows"]) == review["generousTargetPassed"] == 0, "Captured gap-width target receipt mismatch")
    check(outcome["consumerReady"] is False and outcome["nativeAdopted"] is False and review["productionAdopted"] is False and review["nativeAdopted"] is False, "Rejection/adoption scope mismatch")
    check(len(read_json("failure-profiles.json.gz")) == 6, "Failure-profile evidence count mismatch")
    for key, count in [("raw", 154), ("afterRawInterpolation", 399)]:
        r = diagnostics["facetChecks"][key]
        check(r["outsideCountRecordedByFrozenEvaluator"] == r["zeroReach"] == count and r["active"] == 0, "Margin residual receipt mismatch")
    check(diagnostics["facetChecks"]["pretransformDiagnostic"]["active"] == 14, "Pretransform active violation receipt mismatch")
    for name in ["captured-profile-comparison.png", "failure-profile-comparison.png"]:
        check(raw(name).startswith(b"\x89PNG\r\n\x1a\n"), "Original figure signature mismatch")

    if args.original:
        original_inventory = read_json("scratch-inventory.json")
        check(inventory(Path(original_inventory["originalRoot"])) == original_inventory["originalFiles"], "Original trial scratch changed")
        for r in report["sourceFiles"]:
            check(receipt(Path(r["file"]).read_bytes()) == pair(r), "Original source input changed: " + r["file"])
        for r in baseline["files"]:
            check(receipt(Path(r["immutableArchive"]["file"]).read_bytes()) == pair(r["expected"]), "Immutable historical source changed: " + r["relativeFile"])
    print(json.dumps({"archiveVerified": True, "storedFilesExcludingManifest": len(manifest["files"]), "exactOriginalPayloads": sum("originalReceipt" in x for x in manifest["files"].values()), "priorReferences": len(refs["archivedReferences"]), "caseAssetHashesChecked": 8, "originalScratchChecked": args.original, "productionAdopted": False, "scope": "Byte/gzip/reference and stored receipt consistency only; no prototype/game imports, geometry reconstruction, numerical/native rerun or adoption pass."}, indent=2))


if __name__ == "__main__":
    main()
