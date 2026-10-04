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
    source = read_json(refs["candidateSourceReceipt"]); prior = read_json(refs["priorCoherentSourceReceipt"]); build = read_json(refs["priorCoherentBuildReceipt"])
    assets = {k: pair(v) for k, v in {**build["assets"], **build["diagnosticAssets"]}.items()}; copy = read_json("copy-receipt.json")
    check(len(source) == len(prior) == 327 and {k: pair(v) for k, v in source.items()} == {k: pair(v) for k, v in prior.items()}, "Source input contents mismatch")
    check(len(assets) == copy["assetCount"] == 50 and {k: pair(v) for k, v in copy["assets"].items()} == assets and copy["productionContentsUnchanged"] and copy["assetContentsUnchanged"], "Asset copy receipt mismatch")
    prep = read_json("preparation.json"); freeze = read_json("freeze-verification.json"); report = read_json("native/report.json.gz"); active = read_json("native/active-snapshots.json.gz"); owner = read_json("native-first-owner.json"); review = read_json("review.json")
    check(report["source"] == prep and prep["frozen"] and prep["launchReady"] and receipt(raw("preparation.json")) == pair(freeze["preparation"]), "Frozen preparation mismatch")
    for key, name in [("native", "source/native.mjs.gz"), ("owner", "source/run.py.gz"), ("collector", "source/inventory.mjs.gz")]: check(receipt(raw(name)) == pair(freeze[key]), "Frozen source changed: " + name)
    check(receipt(raw("candidate-source-frozen.json.gz")) == pair(prep["productionInputs"]["frozen"]), "Source snapshot receipt mismatch")
    neutral = {"paddle": False, "popUp": False, "steer": 0, "crouch": 0, "compress": 0, "trim": 0, "pocketReflex": False}
    check(report["input"] == report["ordinaryStep"]["input"] == prep["policy"]["input"] == neutral and report["physicsAdvances"] == 1 and math.isclose(report["ordinaryStep"]["after"] - report["ordinaryStep"]["before"], 1 / 60, abs_tol=1e-10), "Ordinary neutral-step receipt mismatch")
    check(len(report["snapshots"]) == len(active["snapshots"]) == 2 and [s["step"] for s in active["snapshots"]] == [0, 1] and all(s["ride"]["phase"] == "prone" for s in active["snapshots"]), "Two prone snapshots mismatch")
    typed = 0; widths = {"Float32Array": 4, "Int32Array": 4, "Uint32Array": 4, "Uint8Array": 1}
    for snapshot, concise in zip(active["snapshots"], report["snapshots"]):
        check(all(snapshot[k] == v for k, v in concise.items() if k != "loftCounts"), "Concise/active snapshot mismatch")
        scalars = snapshot["loft"]["scalars"]; arrays = snapshot["loft"]["arrays"]
        check(len(arrays) == 37 and snapshot["loft"]["byteOrder"] == "little-endian", "Typed array inventory/order mismatch")
        for name, info in list(arrays.items()) + [("rawFront", snapshot["rawFront"]["values"])]:
            data = base64.b64decode(info["base64"], validate=True)
            check(receipt(data) == pair(info) and len(data) == info["elements"] * widths[info["type"]], "Typed byte transport mismatch: " + name); typed += 1
        check(arrays["positions"]["elements"] == scalars["vertexCount"] * 3 and arrays["indices"]["elements"] == scalars["indexCount"] and snapshot["rawFront"]["values"]["elements"] == snapshot["rawFront"]["stride"] * snapshot["rawFront"]["recordCount"], "Active extent receipt mismatch")
        audit = snapshot["faceAudit"]
        check(audit["eligiblePairs"] == len(audit["pairs"]) == 13 and audit["facePassed"] == 0 and {r["front"] for r in audit["pairs"]} == {79}, "Eligible-pair inventory result mismatch")
        check(audit["rejectionCounts"] == {"invalidWaveNormal": 0, "zeroOrInvalidAverageRay": 0, "normalDotBelow": 0, "boardBehindCrest": 13, "boardBeyondForwardFace": 0}, "Position/normal rejection result mismatch")
    check(typed == 76 and read_json("source-checks.json")["passedMockGroups"] == 18, "Buffer/fixture receipt count mismatch")
    check(report["complete"] and report["firstFailure"] is None and report["browserErrors"] == [] and report["chromeClosed"] and report["video"] is None, "Recorded native completion mismatch")
    check(report["pngCount"] == 2 and report["pngBytes"] == 3851178 and owner["captureValidation"]["physicsAdvances"] == 1 and owner["captureValidation"]["readOnlyInventoryIsEntryPass"] is False, "Artifact/entry scope mismatch")
    for info in owner["captureValidation"]["artifactReceipts"]:
        name = "native/" + info["file"] + (".gz" if info["file"].endswith(".json") else "")
        check(receipt(raw(name)) == pair(info), "Artifact receipt mismatch: " + name)
        if name.endswith(".png"): check(raw(name).startswith(b"\x89PNG\r\n\x1a\n"), "PNG signature mismatch")
    check(owner["complete"] and owner["exitCode"] == 0 and owner["firstFailure"] is None and owner["failures"] == [] and owner["remainingOwnedPids"] == [] and owner["closedPorts"] == {"4294": True, "9704": True}, "Recorded owner closure mismatch")
    check(owner["userPortsOpenBefore"] == owner["userPortsOpenAfter"] == {"4310": True, "4311": True, "4312": True} and all(owner[k] is True for k in ["userServersStayedOpen", "copiedDistUnchanged", "diagnosticSourcesUnchanged", "candidateProductionInputsUnchanged", "independentClosureValid"]), "Recorded user/source preservation mismatch")
    check(owner["elapsedSeconds"] <= 180 and owner["cleanupElapsedSeconds"] <= 7 and review["entryOrSpawnFixAccepted"] is False and review["nativeSessionReportedByRoot"] == 64244, "Finite/interpretation scope mismatch")
    for name, info in owner["served"].items(): check(pair(info) == assets[name], "Served asset receipt mismatch")
    analysis_refs = refs["attributedOfflineAnalysis"]
    causal = read_json("analysis/causal-conclusion.json.gz"); audit = read_json("analysis/audit.json.gz"); analysis = read_json("analysis/inventory-analysis.json.gz"); columns = read_json("analysis/exact-global-columns.json.gz")
    completed = read_json("analysis/completed-analysis-receipt.json")
    for name, info in completed.items(): check(receipt(raw("analysis/" + name + ".gz")) == info, "Completed analysis receipt mismatch: " + name)
    for name, info in analysis_refs["originalAnalysisFiles"].items():
        suffix = "" if name == "completed-analysis-receipt.json" else ".gz"
        check(receipt(raw("analysis/" + name + suffix)) == info, "Attributed analysis bytes mismatch: " + name)
    check(pair(columns["source"]) == pair(analysis["inventory"]) == receipt(raw("native/active-snapshots.json.gz")), "Offline source snapshot mismatch")
    witness = receipt(raw(analysis_refs["indexedWitnessHelper"]))
    check(witness["sha256"] == columns["helper"]["sha256"], "Unchanged indexed helper reference mismatch")
    check(audit["sources"] == analysis_refs["sourceReceiptsExactlyAsRecorded"] and len(audit["sources"]) == 9, "Read-source receipt inventory mismatch")
    for name, info in audit["sources"].items(): check(pair(info) == pair(source[name]), "Audit/frozen source content mismatch: " + name)
    for case, info in zip(analysis["cases"], analysis_refs["caseAssets"]):
        check(case["id"] == info["case"] and pair(case["asset"]) == info["originalAssetReceipt"] == receipt((REPO / info["repositoryRelative"]).read_bytes()), "Library input asset mismatch")
    check(len(analysis["cases"]) == 4 and len(analysis["snapshots"]) == len(columns["snapshots"]) == 2, "Offline scope count mismatch")
    for stored, captured in zip(analysis["snapshots"], active["snapshots"]):
        check(stored["step"] == captured["step"] and stored["faceAudit"] == captured["faceAudit"] and stored["boardPose"] == captured["boardPose"] and len(stored["rawRecords"]) == 74, "Offline captured-input receipt mismatch")
    for snapshot, expected in zip(columns["snapshots"], [(0, 698, 284, 24, 1.792661715616084), (1, 706, 299, 23, 1.7898784007035362)]):
        step, coarse, threshold_count, connected, height = expected
        check(snapshot["step"] == step and snapshot["eligibleJoinedRowPairs"] == 13 and snapshot["coarseCandidateFronts"] == [79] and snapshot["coarseThreeCrossingIntervalCount"] == coarse and snapshot["coarseHeightAtLeast1_23"] == threshold_count and len(snapshot["exactShortlist"]) == 24, "Recorded fixed-column budget mismatch")
        check(sum(c["oneConnectedStrictThreeCrossingColumn"] for c in snapshot["exactShortlist"]) == connected and snapshot["maximumSampledExactHeight"] == height, "Recorded column result mismatch")
    check(audit["resourcesStarted"] is False and audit["originalsModified"] is False and audit["trace"]["eligiblePairs"] == audit["trace"]["faceRejected"] == 10755 and audit["trace"]["coarse"] == audit["trace"]["exact"] == audit["trace"]["popupInputs"] == 0, "Historical audit scope mismatch")
    check(analysis["runtimeLaunched"] is False and analysis["originalsModified"] is False and all(causal[k] is False for k in ["runtimeLaunched", "productionSourceChanged", "priorOriginalsChanged"]) and causal["oneRecommendedNextTrial"]["sourceChangeProposed"] is False, "Causal analysis/adoption scope mismatch")
    offline_review = review["attributedCompletedOfflineAnalysis"]
    check(offline_review["rowEligibilityRetained"] and offline_review["playerFaceAndDistanceGatesRemoved"] and offline_review["heightIsPositiveSampledEvidenceOnly"] and offline_review["openingWidthBodyFitEntryOrExhaustiveMaximumEstablished"] is False, "Attributed height-evidence limit mismatch")
    for name, info in [("../directed-entry-selection/native/report.json.gz", audit["originalReport"]), ("../directed-entry-selection/native-first-owner.json", audit["originalOwner"]), ("../directed-entry-selection/source/tube-target.mjs.gz", audit["selector"])]:
        check(receipt(raw(name)) == pair(info), "Historical audit reference mismatch: " + name)
    causal_inputs = ["native/active-snapshots.json.gz", "../directed-entry-selection/native/report.json.gz", "../coherent-startup/native/report.json.gz", analysis_refs["indexedWitnessHelper"]]
    check(len(causal["verification"]["originalInputReceiptsRechecked"]) == len(causal_inputs), "Causal input reference count mismatch")
    for name, info in zip(causal_inputs, causal["verification"]["originalInputReceiptsRechecked"]): check(receipt(raw(name)) == pair(info), "Causal original input receipt mismatch: " + name)
    if args.original:
        dist = Path(refs["originalDist"])
        check({str(p.relative_to(dist)) for p in dist.rglob("*") if p.is_file()} == set(assets), "Original dist inventory changed")
        for name, info in assets.items(): check(receipt((dist / name).read_bytes()) == info, "Original dist changed: " + name)
        for info in source.values(): check(receipt(Path(info["path"]).read_bytes()) == pair(info), "Original source input changed: " + info["path"])
    print(json.dumps({"archiveVerified": True, "storedFilesExcludingManifest": len(m["files"]), "exactOriginalPayloads": sum("originalReceipt" in r for r in m["files"].values()), "priorReferences": len(refs["priorArchivedReferences"]), "sourceInputsContentMatched": 327, "distReceiptsContentMatched": 50, "losslessTypedBuffersChecked": typed, "attributedAnalysisFilesChecked": len(analysis_refs["originalAnalysisFiles"]), "attributedSourceReceiptsMatched": 9, "libraryAssetReceiptsChecked": 4, "originalScratchChecked": args.original, "recordedOwnerClosureConsistent": True, "entryOrSpawnFixAccepted": False, "scope": "Storage/gzip/typed-byte/reference and recorded receipt checks; no imports, new geometry/distance analysis, numerical/native rerun or live probes."}, indent=2))
if __name__ == "__main__": main()
