#!/usr/bin/env python3
"""Read-only preservation and stored-receipt checks; no game/helper imports or reruns."""
import argparse
import collections
import gzip
import hashlib
import json
import math
import os
from pathlib import Path

A = Path(__file__).resolve().parent


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
    parser.add_argument("--original", action="store_true", help="Also read original frozen scratch/source/dist; no launches or port probes.")
    args = parser.parse_args()
    manifest = read_json("manifest.json")
    files = {str(p.relative_to(A)) for p in A.rglob("*") if p.is_file() and p.name != "manifest.json"}
    check(files == set(manifest["files"]), "Archive inventory changed")
    for name, info in manifest["files"].items():
        data = (A / name).read_bytes()
        check(receipt(data) == info["storedReceipt"], "Stored bytes changed: " + name)
        if info["encoding"] == "gzip":
            check(receipt(gzip.decompress(data)) == info["decodedReceipt"], "Decoded bytes changed: " + name)
        if "originalReceipt" in info:
            check(receipt(raw(name)) == info["originalReceipt"], "Original transport mismatch: " + name)
        if args.original:
            for path in info.get("originalPaths", []):
                check(receipt(Path(path).read_bytes()) == info["originalReceipt"], "Original file changed: " + path)
    refs = read_json("input-references.json")
    check(refs["priorArchivedReferences"] == manifest["priorArchivedReferences"], "Reference inventory mismatch")
    for name, info in refs["priorArchivedReferences"].items():
        data = (A / name).read_bytes()
        decoded = gzip.decompress(data) if info["encoding"] == "gzip" else data
        check(receipt(data) == info["transportReceipt"] and receipt(decoded) == info["decodedReceipt"], "Prior reference changed: " + name)
        if args.original and info.get("sameAsOriginalPath"):
            check(receipt(Path(info["sameAsOriginalPath"]).read_bytes()) == info["decodedReceipt"], "Original reference alias changed: " + name)

    snapshot = read_json("candidate-source-frozen.json.gz")
    prior = read_json(refs["priorCoherentSourceReceipt"])
    prior_build = read_json(refs["priorCoherentBuildReceipt"])
    assets = {k: pair(v) for k, v in {**prior_build["assets"], **prior_build["diagnosticAssets"]}.items()}
    base = read_json("base-copy-receipt.json")
    check(len(snapshot) == len(prior) == base["productionCount"] == 327 and {k: pair(v) for k, v in snapshot.items()} == {k: pair(v) for k, v in prior.items()}, "Copied candidate source contents mismatch")
    check(len(assets) == base["distCount"] == 50 and base["assets"] == assets and base["productionContentsUnchanged"] and base["distContentsUnchanged"], "Copied build assets mismatch")
    prep = read_json("preparation.json")
    policy = read_json("policy.json")
    freeze = read_json("freeze-verification.json")
    source_checks = read_json("source-checks.json")
    report = read_json("native/report.json.gz")
    owner = read_json("native-first-owner.json")
    summary = read_json("result-summary.json")
    check(report["source"] == prep and report["policy"] == prep["policy"] == policy and prep["frozen"] and prep["launchReady"], "Frozen native preparation mismatch")
    check(receipt(raw("preparation.json")) == pair(freeze["preparation"]) and receipt(raw("candidate-source-frozen.json.gz")) == pair(prep["productionInputs"]["frozen"]), "Freeze receipt mismatch")
    for key, name in [("native", "source/native.mjs.gz"), ("owner", "source/run.py.gz"), ("bodyWitnesses", "source/body-witnesses.mjs.gz"), ("selector", "source/tube-target.mjs.gz"), ("policy", "policy.json")]:
        check(receipt(raw(name)) == pair(freeze[key]), "Frozen diagnostic bytes mismatch: " + name)
    check({k: pair(v) for k, v in {**prep["assets"], **prep["diagnosticAssets"]}.items()} == assets, "Preparation assets mismatch")
    for info in prep["diagnosticSources"].values():
        matches = [v for v in manifest["files"].values() if info["file"] in v.get("originalPaths", [])]
        if matches:
            check(matches[0]["originalReceipt"] == pair(info), "Diagnostic source provenance mismatch: " + info["file"])
    check(source_checks["helperMockPassed"] == 21 and sum(v["passed"] for v in source_checks["checks"].values()) == 21, "Stored extracted fixture count mismatch")

    rows = [json.loads(line) for line in raw("native/steps.ndjson.gz").splitlines()]
    check(rows == report["steps"] and len(rows) == report["stepCount"] == summary["steps"] == 545 and [r["step"] for r in rows] == list(range(1, 546)), "Report/NDJSON step sequence mismatch")
    check(dict(collections.Counter(r["ride"]["phase"] for r in rows)) == summary["phases"] == {"prone": 544, "fallen": 1}, "Published phase result mismatch")
    check(report["stop"] == summary["stop"] and summary["stop"]["separation"] == "lost board" and summary["stop"]["resets"] == 0 and math.isclose(rows[-1]["physicalSeconds"], 545 / 60), "Trajectory stop/duration mismatch")
    check(report.get("firstStanding") is None and summary["firstStanding"] is None and report["video"] is None and report["videoTrigger"] is None and report["videoRequests"] == [] and summary["movieTriggered"] is False, "Unexpected standing/movie result")
    check(sum(r["tubeTarget"]["rowPairsEligible"] for r in rows) == summary["eligibleRowPairObservations"] == 10755 and sum(r["tubeTarget"]["rejected"]["faceEligibility"] for r in rows) == summary["faceEligibilityRejectedObservations"] == 10755, "Repeated selection observation count mismatch")
    check(sum(r["tubeTarget"]["coarseCandidateCount"] for r in rows) == summary["coarseCandidates"] == 0 and sum(r["tubeTarget"]["exactColumnCount"] for r in rows) == summary["exactColumnChecks"] == 0 and sum(r["tubeTarget"]["rejected"]["noCoarseAir"] for r in rows) == summary["coarseAirRejections"] == 0, "Air-stage result mismatch")
    check(all(r["tubeTarget"]["target"] is None and r["tubeTarget"]["attempts"] == [] and r["tubeTarget"]["lockedFront"] is None for r in rows), "Unexpected selected target/air attempt")
    check(sum(bool(r["input"].get("popUp")) for r in rows) == summary["popupPulses"] == 0 and sum(bool(r["steeringControl"]["targetActive"]) for r in rows) == summary["targetedInputs"] == 0 and max(abs(r["input"]["steer"]) for r in rows) == summary["maximumAbsoluteAppliedSteer"] == 0, "Input outcome mismatch")
    check(all(r["tubeTarget"]["headHeightDemand"]["requiredHeight"] == 1.23 for r in rows) and policy["target"]["nominalCrouchedHeadTopAboveBoard"] == 1.13 and policy["target"]["deckAllowance"] == 0.1, "Nominal demand receipt mismatch")
    check(report["entry"]["firstConnectedWitnessEntry"] is None and report["entry"]["firstPartial"] is None and report["entry"]["maximumConsecutiveContainedSteps"] == 0 and report["entry"]["fullBodyClearancePass"] is False and summary["entryOrClearanceAccepted"] is False, "Entry interpretation mismatch")
    check(report["complete"] and report["firstFailure"] is None and report["browserErrors"] == summary["browserErrors"] == [] and report["chromeClosed"] and summary["nativeSession"] == 66575 and summary["terminalExitCode"] == 0, "Recorded native completion mismatch")
    check(report["overrides"] is None and report["initial"]["config"]["componentCount"] == 64 and report["initial"]["config"]["seed"] == 1 and report["initial"]["config"]["dx"] == 2 and report["initial"]["config"]["fineSpacing"] == 1, "Actual menu configuration mismatch")

    png_names = [a["file"] for a in report["artifacts"] if a["file"].endswith(".png")]
    check(png_names == ["00-initial-prone-after-install-ready.png", "01-final.png"] and report["pngCount"] == 2 and report["pngBytes"] == 4384341, "Original PNG receipt mismatch")
    for info in owner["captureValidation"]["artifactReceipts"]:
        name = "native/" + info["file"] + (".gz" if info["file"] == "steps.ndjson" else "")
        check(receipt(raw(name)) == pair(info), "Owner artifact bytes mismatch: " + name)
        if info["file"].endswith(".png"):
            check(raw(name).startswith(b"\x89PNG\r\n\x1a\n") and info["bytes"] <= prep["artifactCaps"]["maximumPngBytesEach"], "PNG signature/cap mismatch")
    check(len(report["artifacts"]) <= prep["artifactCaps"]["maximumUniqueArtifacts"] and report["pngBytes"] <= prep["artifactCaps"]["maximumPngBytesTotal"] and len(raw("native/report.json.gz")) <= prep["artifactCaps"]["maximumReportBytes"] and len(raw("native/steps.ndjson.gz")) <= prep["artifactCaps"]["maximumNdjsonBytes"], "Recorded artifact caps exceeded")
    check(owner["complete"] and owner["exitCode"] == 0 and owner["firstFailure"] is None and owner["failures"] == [] and owner["remainingOwnedPids"] == [] and owner["closedPorts"] == {"4293": True, "9703": True}, "Recorded owner closure mismatch")
    check(owner["userPortsOpenBefore"] == owner["userPortsOpenAfter"] == {"4310": True, "4311": True, "4312": True} and all(owner[k] is True for k in ["userServersStayedOpen", "copiedDistUnchanged", "diagnosticSourcesUnchanged", "candidateProductionInputsUnchanged", "independentClosureValid"]), "Recorded user-server/freeze preservation mismatch")
    check(owner["elapsedSeconds"] <= 180 and owner["cleanupElapsedSeconds"] <= 7 and owner["captureValidation"]["captureCompletionIsEntryPass"] is False, "Recorded finite owner scope mismatch")
    for name, info in owner["served"].items():
        check(pair(info) == assets[name], "Served build receipt mismatch: " + name)

    if args.original:
        saved = read_json("scratch-inventory.json.gz")
        check(inventory(Path(saved["originalRoot"])) == saved["originalFiles"], "Original directed scratch changed")
        dist = Path(refs["originalDist"])
        check({str(p.relative_to(dist)) for p in dist.rglob("*") if p.is_file()} == set(assets), "Original dist inventory changed")
        for name, info in assets.items():
            check(receipt((dist / name).read_bytes()) == info, "Original dist bytes changed: " + name)
        for info in snapshot.values():
            check(receipt(Path(info["path"]).read_bytes()) == pair(info), "Original candidate input changed: " + info["path"])
    print(json.dumps({"archiveVerified": True, "storedFilesExcludingManifest": len(manifest["files"]), "exactOriginalPayloads": sum("originalReceipt" in x for x in manifest["files"].values()), "priorReferences": len(refs["priorArchivedReferences"]), "sourceInputsContentMatched": 327, "distReceiptsContentMatched": 50, "originalScratchChecked": args.original, "recordedOwnerClosureConsistent": True, "repeatedEligibleObservations": 10755, "airHeightTested": False, "entryAccepted": False, "scope": "Byte/gzip/reference and recorded receipt consistency only; no imports, selection/air generation, numerical/native rerun or live resource probes."}, indent=2))


if __name__ == "__main__":
    main()
