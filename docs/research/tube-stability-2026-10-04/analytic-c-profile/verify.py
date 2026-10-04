#!/usr/bin/env python3
"""Read-only byte/transport and stored-receipt checks; no trial/game imports or reruns."""
import argparse, base64, gzip, hashlib, json, math, os
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
        if p.is_symlink(): result[name] = {"symlinkTarget": os.readlink(p)}
        elif p.is_file(): result[name] = receipt(p.read_bytes())
    return result
def preservation_checks(args):
    manifest = read_json("manifest.json")
    names = {str(p.relative_to(A)) for p in A.rglob("*") if p.is_file() and p.name != "manifest.json"}
    check(names == set(manifest["files"]), "Archive inventory changed")
    for name, info in manifest["files"].items():
        data = (A / name).read_bytes()
        check(receipt(data) == info["storedReceipt"], "Stored bytes changed: " + name)
        if info["encoding"] == "gzip": check(receipt(gzip.decompress(data)) == info["decodedReceipt"], "Decoded bytes changed: " + name)
        if "originalReceipt" in info: check(receipt(raw(name)) == info["originalReceipt"], "Original transport mismatch: " + name)
        if "originalTransportReceipt" in info: check(receipt(data) == info["originalTransportReceipt"], "Original gzip transport changed: " + name)
        if args.original:
            for p in info.get("originalPaths", []): check(receipt(Path(p).read_bytes()) == info["originalReceipt"], "Original changed: " + p)
            for p in info.get("originalTransportPaths", []): check(receipt(Path(p).read_bytes()) == info["originalTransportReceipt"], "Original gzip changed: " + p)
    refs = read_json("input-references.json")
    check(refs["priorArchivedReferences"] == manifest["priorArchivedReferences"], "Reference inventory mismatch")
    for name, info in refs["priorArchivedReferences"].items():
        data = (A / name).read_bytes(); decoded = gzip.decompress(data) if info["encoding"] == "gzip" else data
        check(receipt(data) == info["transportReceipt"] and receipt(decoded) == info["decodedReceipt"], "Prior reference changed: " + name)
        if args.original and info.get("sameAsOriginalPath"): check(receipt(Path(info["sameAsOriginalPath"]).read_bytes()) == info["decodedReceipt"], "Original reference alias changed: " + name)
    if args.original:
        saved = read_json("scratch-inventory.json.gz")
        check(inventory(Path(saved["originalRoot"])) == saved["originalFiles"], "Original scratch inventory changed")
    return manifest, refs

def main():
    p = argparse.ArgumentParser(description=__doc__); p.add_argument("--original", action="store_true"); args = p.parse_args()
    m, refs = preservation_checks(args)
    original = read_json("original-manifest.json")
    for r in original["files"]:
        matches = [v for v in m["files"].values() if r["file"] in v.get("originalPaths", []) or r["file"] in v.get("originalTransportPaths", [])]
        check(len(matches) == 1, "Original manifest payload missing: " + r["file"])
        v = matches[0]; expected = v["originalTransportReceipt"] if r["file"] in v.get("originalTransportPaths", []) else v["originalReceipt"]
        check(expected == pair(r), "Original manifest byte mismatch: " + r["file"])
    report = read_json("report.json.gz"); summary = read_json("summary.json.gz"); diag = read_json("causal-diagnostics.json.gz"); start = read_json("evaluation-start.json")
    check(report["complete"] and report["outcome"] == summary["outcome"] and report["freeze"] == start and start["declaredBeforeEvaluation"], "Frozen report chronology mismatch")
    for key, name in [("recipe", "recipe.md"), ("prototype", "prototype.py"), ("evaluator", "evaluate.py")]: check(receipt(raw(name)) == pair(start[key]), "Frozen code changed: " + name)
    o = summary["outcome"]
    for key, expected in [("captured", (5, 5, 0, 0)), ("all1224Frames", (1224, 1219, 5, 39)), ("all3648AdjacentF32", (3648, 3632, 16, 116)), ("continuousPhaseGrid", (376, 367, 9, 15)), ("parameterCrossCaseGrid", (672, 672, 0, 23))]:
        r = o[key]; check((r["attempted"], r["valid"], r["invalid"], r["cleanToCrossed"]) == expected, "Recorded domain/crossing result mismatch: " + key)
    check(o["captured113Width125Pass"] and o["captured160Width125Pass"] and o["consumerReady"] is False and o["nativeAdopted"] is False, "Captured target/adoption scope mismatch")
    check(len(summary["captured"]) == 5 and len(diag["zeroStateAlgebraicLimits"]) == len(diag["impactTransitions"]) == 8, "Captured/limit audit count mismatch")
    check(diag["maximumFormationTailJumpH0"] == 0.012403522703485109 and diag["maximumRetirementTailJumpH0"] == 0.017586361060359112 and diag["noNewRecipeEvaluated"], "Zero-state limit failure mismatch")
    check(len(diag["precisionFailures"]) == 30 and len(read_json("failure-profiles.json.gz")) == 3, "Failure evidence count mismatch")
    check(len(diag["crossingClassifications"]["phase"]) == 30 and len(diag["crossingClassifications"]["crossCase"]) == 46 and all(r["intendedCapPlateauContactResidual"] for key in ["phase", "crossCase"] for r in diag["crossingClassifications"][key]), "Contact residual classification mismatch")
    check(refs["sourceReceiptsExactlyAsRecorded"] == report["sources"] and refs["immutableDependenciesExactlyAsRecorded"] == diag["immutableDependencies"], "Recorded input provenance mismatch")
    check(len(refs["caseAssets"]) == 8 and sum(r["rawFrameCount"] for r in refs["caseAssets"]) == 1224, "Raw case input count mismatch")
    for r in refs["caseAssets"]: check(receipt((REPO / r["repositoryRelative"]).read_bytes()) == pair(r["originalAssetReceipt"]), "Case asset changed")
    for n in ["captured-profile-comparison.png", "failure-profile-comparison.png"]: check(raw(n).startswith(b"\x89PNG\r\n\x1a\n"), "Original numeric figure signature mismatch")
    check(original["consumerReady"] is False and original["nativeAdopted"] is False and original["frozenRecipeUntuned"] and m["productionAdopted"] is False, "Original rejection scope mismatch")
    print(json.dumps({"archiveVerified": True, "storedFilesExcludingManifest": len(m["files"]), "exactOriginalPayloads": sum("originalReceipt" in r for r in m["files"].values()), "priorReferences": len(refs["priorArchivedReferences"]), "caseAssetHashesChecked": 8, "originalScratchChecked": args.original, "productionAdopted": False, "scope": "Storage/gzip/reference and stored receipt checks; no game/prototype imports, reconstruction, evaluation or native rerun."}, indent=2))
if __name__ == "__main__": main()
