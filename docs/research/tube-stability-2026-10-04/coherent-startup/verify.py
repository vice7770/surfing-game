#!/usr/bin/env python3
"""Read-only bytes, gzip transport and recorded receipt checks; never run game code."""
import argparse
import gzip
import hashlib
import json
import math
import os
from pathlib import Path

A = Path(__file__).resolve().parent


def receipt(data):
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def pair(info):
    return {k: info[k] for k in ("bytes", "sha256")}


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
    parser.add_argument("--original", action="store_true", help="Also read original scratch inputs; no launch or simulation.")
    args = parser.parse_args()
    manifest = read_json("manifest.json")
    actual_names = {str(p.relative_to(A)) for p in A.rglob("*") if p.is_file() and p.name != "manifest.json"}
    check(actual_names == set(manifest["files"]), "Archive file inventory changed")
    for name, info in manifest["files"].items():
        data = (A / name).read_bytes()
        check(receipt(data) == info["storedReceipt"], "Stored bytes differ: " + name)
        if info.get("encoding") == "gzip":
            check(receipt(gzip.decompress(data)) == info["decodedReceipt"], "Decoded bytes differ: " + name)
        if "originalReceipt" in info:
            check(receipt(raw(name)) == info["originalReceipt"], "Original transport mismatch: " + name)
        if args.original:
            for original in info.get("originalPaths", []):
                check(receipt(Path(original).read_bytes()) == info["originalReceipt"], "Original changed: " + original)
    refs = read_json("input-references.json")
    check(refs["priorArchivedReferences"] == manifest["priorArchivedReferences"], "Reference inventory mismatch")
    for name, info in refs["priorArchivedReferences"].items():
        data = (A / name).read_bytes()
        check(receipt(data) == info["transportReceipt"], "Reference transport changed: " + name)
        check(receipt(gzip.decompress(data)) == info["decodedReceipt"], "Reference decoded bytes changed: " + name)

    pins = read_json("candidate/source-manifest.json")
    build = read_json("native/build-result.json")
    prep = read_json("native/preparation.json")
    report = read_json("native/report.json.gz")
    owner = read_json("native/native-first-owner.json")
    review = read_json("review.json")
    final = read_json("candidate/final-receipt.json")
    partial = read_json("candidate/partial-results.json")
    cancellation = read_json("candidate/cancellation.json")
    adoption = read_json("native/root-adoption.json")
    integration = read_json("native/root-integration-validation.json")
    command_correction = read_json("native/root-integration-command-correction.json")
    snapshot = read_json("native/candidate-source-frozen.json.gz")
    check(len(pins["files"]) == 3 and len(snapshot) == 327, "Candidate source count mismatch")
    check(pins["baseCommit"] == build["baseSourceRevision"] == prep["acceptedBaseRevision"] == refs["acceptedBase"], "Accepted base mismatch")
    check(pins["files"] == final["sourceFiles"] == build["candidateFiles"] == prep["rootSourceFreezeProof"]["files"], "Candidate source pin mismatch")
    check(hashlib.sha256(raw("candidate/candidate.patch.gz")).hexdigest() == pins["patchSha256"] == build["buildSourceCandidatePatchSha256"], "Patch hash mismatch")
    for pin in pins["files"]:
        check(hashlib.sha256(raw("candidate/source/" + pin["path"] + ".gz")).hexdigest() == pin["candidateSha256"], "Candidate bytes mismatch: " + pin["path"])
    check(prep["rootSourceFreezeProof"]["productionPrePostIdentical"] is True, "Recorded source drift")
    check(receipt(raw("native/candidate-source-frozen.json.gz")) == pair(prep["rootSourceFreezeProof"]["preBuild"]) == pair(prep["rootSourceFreezeProof"]["postBuild"]), "Pre/post source receipt mismatch")
    check(len(build["assets"]) == 49 and len(build["diagnosticAssets"]) == 1 and build["productionInputs"] == {"count": 327, "unchanged": True}, "Build asset/input count mismatch")
    check(build["terminal"] and build["exitCode"] == 0 and build["buildSession"] == 39991, "Recorded build incomplete")
    check(prep["frozen"] and prep["launchReady"] and report["source"] == prep, "Final native preparation mismatch")
    check(prep["diagnosticBundleProvenance"]["compiledFromRepointedEntry"] is False and build["diagnosticAssets"]["diagnostic-autopilot.mjs"]["compiledFromNewEntry"] is False, "Bundle provenance changed")
    for info in prep["diagnosticSources"].values():
        matches = [v for v in manifest["files"].values() if info["file"] in v.get("originalPaths", [])]
        if matches:
            check(pair(info) == matches[0]["originalReceipt"], "Diagnostic source receipt mismatch: " + info["file"])

    check(final["checks"]["frontFocused"]["passed"] == 37 and final["checks"]["startupFocused"]["passed"] == 5 and final["checks"]["strictTypeScript"]["exitCode"] == 0, "Focused validation receipt mismatch")
    check(partial["recordedPasses"] == 124 and partial["recordedFailures"] == 0 and partial["terminalExitCode"] == 143 and partial["ownedGroupClosed"] and partial["fullFiveSuiteGreen"] is False, "Partial validation receipt mismatch")
    check(cancellation["groupClosed"] and cancellation["finalGroupProcesses"] == [] and cancellation["signal"] == "SIGTERM", "Cancellation closure receipt mismatch")
    check(final["checks"]["broaderPartial"] == partial, "Final partial receipt mismatch")
    for info in final["evidenceFiles"]:
        matches = [v for v in manifest["files"].values() if any(p.endswith("/tube-coherent-warmup-20261004/" + info["path"]) for p in v.get("originalPaths", []))]
        check(len(matches) == 1 and matches[0]["originalReceipt"] == pair(info), "Source evidence receipt mismatch: " + info["path"])

    rows = [json.loads(line) for line in raw("native/steps.ndjson.gz").splitlines()]
    check(rows == report["steps"] and len(rows) == report["stepCount"] == 385, "Report/NDJSON mismatch")
    check([r["step"] for r in rows] == list(range(1, 386)), "Ordinary step sequence mismatch")
    check(report["complete"] and report["firstFailure"] is None and report["browserErrors"] == [] and report["chromeClosed"], "Recorded native failure")
    check(report["overrides"] is None and report["initial"]["config"]["seed"] == 1 and report["initial"]["config"]["componentCount"] == 64 and report["initial"]["config"]["dx"] == 2 and report["initial"]["config"]["fineSpacing"] == 1, "Actual menu configuration mismatch")
    initial = report["initialBody"]
    check(initial["seaCounters"]["rawFrontCount"] == 74 and initial["seaCounters"]["lipLaunches"] == 77 and initial["loft"]["slices"] == 129, "Startup activity receipt mismatch")
    check(all(r["seaCounters"]["rawFrontCount"] > 0 and r["loft"]["slices"] > 0 and r["loft"]["indices"] > 0 for r in rows), "Recorded lifecycle activity missing")
    standing = [r for r in rows if r["ride"]["phase"] == "standing"]
    check(len(standing) == 302 and standing[0]["step"] == 83 and standing[-1]["step"] == 384, "Standing interval mismatch")
    check({r["witness"]["classification"] for r in standing if r.get("witness")} == {"outside"}, "Standing witness result mismatch")
    check(report["firstStanding"]["step"] == 83 and report["stop"]["step"] == 385 and report["stop"]["separation"] == "balance" and report["stop"]["resets"] == 0, "Final trajectory mismatch")
    check(report["entry"]["firstConnectedWitnessEntry"] is None and report["entry"]["firstPartial"] is None and report["entry"]["maximumConsecutiveContainedSteps"] == 0 and report["entry"]["fullBodyClearancePass"] is False, "Entry claim mismatch")
    check(math.isclose(review["trajectory"]["firstStandingToFallSeconds"], 302 / 60) and review["trajectory"]["closestAbsoluteFiniteStandingCurlDistance"] == 12.5, "Review duration/distance mismatch")

    video = report["video"]
    requests = report["videoRequests"]
    check(video["complete"] and video["tracksStopped"] and video["startStep"] == 240 and video["endStep"] == 385 and video["physicsAdvances"] == 145 and video["requestCount"] == len(requests) == 146, "Movie receipt mismatch")
    check([r["step"] for r in requests] == list(range(240, 386)) and [r["request"] for r in requests] == list(range(1, 147)) and requests[0]["requestedBeforeRecorderStartEvent"], "Movie request sequence mismatch")
    check(video["physicalPlaybackRateClaim"] is False and video["encodedFrameCountClaim"] is False and report["videoTrigger"]["witnessClassification"] == "outside", "Movie/entry interpretation mismatch")
    check((A / "native/standing-motion.webm").read_bytes().startswith(b"\x1a\x45\xdf\xa3"), "Movie container signature mismatch")
    check(report["pngCount"] == 3 and report["pngBytes"] == 5995866 and len(report["checkpoints"]) == 3 and [x["step"] for x in report["checkpoints"]] == [0, 83, 385], "Checkpoint receipt mismatch")
    for info in owner["captureValidation"]["artifactReceipts"]:
        name = "native/" + info["file"] + (".gz" if info["file"] == "steps.ndjson" else "")
        check(receipt(raw(name)) == pair(info), "Owner artifact mismatch: " + name)
        if name.endswith(".png"):
            check(raw(name).startswith(b"\x89PNG\r\n\x1a\n"), "PNG signature mismatch: " + name)
    check(len(owner["captureValidation"]["artifactReceipts"]) <= 6 and video["bytes"] <= 16 * 1024 * 1024 and report["pngBytes"] <= 48 * 1024 * 1024, "Recorded artifact caps exceeded")
    check(owner["complete"] and owner["exitCode"] == 0 and owner["firstFailure"] is None and owner["failures"] == [] and owner["remainingOwnedPids"] == [] and owner["closedPorts"] == {"4292": True, "9702": True}, "Recorded owner closure invalid")
    check(all(owner[k] is True for k in ["userServersStayedOpen", "copiedDistUnchanged", "diagnosticSourcesUnchanged", "candidateProductionInputsUnchanged", "independentClosureValid"]), "Recorded closure/freeze mismatch")
    check(owner["elapsedSeconds"] <= 180 and owner["cleanupElapsedSeconds"] <= 7 and owner["captureValidation"]["captureCompletionIsEntryPass"] is False, "Recorded finite owner contract mismatch")
    for name, info in owner["served"].items():
        check(pair(info) == pair({**build["assets"], **build["diagnosticAssets"]}[name]), "Served asset pin mismatch: " + name)

    check(adoption["startupAccepted"] and adoption["nativeCompleted"] and adoption["nativeExitCode"] == 0 and adoption["tubeQualityAccepted"] is False, "Root adoption receipt mismatch")
    for item, pin in zip(adoption["files"], pins["files"]):
        check(item["file"] == pin["path"] and item["adoptedSha256"] == pin["candidateSha256"] and item["beforeSha256"] == pin["baseSha256"], "Adopted bytes mismatch")
    checks = integration["checks"]
    check(command_correction["originalSha256"] == hashlib.sha256(raw("native/root-integration-validation.json")).hexdigest() and command_correction["recordedCommandTypo"] == checks[0]["command"], "Command correction provenance mismatch")
    check(command_correction["actualCommand"] == "./node_modules/.bin/vitest run src/wave/SurfZoneSimulation.test.ts -t 'deferred spin-up' --reporter=dot" and command_correction["passed"] == 0 and command_correction["skipped"] == 86, "Actual wrong-filter command/result mismatch")
    check(checks[0]["passed"] == 0 and checks[0]["skipped"] == 86 and checks[1]["passed"] == 5 and checks[2]["passed"] == 37 and all(c["exitCode"] == 0 for c in checks), "Root integration receipt mismatch")
    check(integration["nativeSourceMatch"] and integration["startupAccepted"] and integration["tubeAppearanceAndEntryAccepted"] is False and integration["fullSuiteGreenClaim"] is False, "Root integration scope mismatch")
    check(review["productionCandidateAdopted"] and review["visualTubeSuccessClaim"] is False and review["entrySuccessClaim"] is False, "Archive adoption scope mismatch")

    if args.original:
        inventories = read_json("original-scratch-inventories.json.gz")["roots"]
        for root, expected in inventories.items():
            check(inventory(Path(root)) == expected, "Original scratch inventory changed: " + root)
        dist = Path(refs["originalDist"])
        assets = {**build["assets"], **build["diagnosticAssets"]}
        check({str(p.relative_to(dist)) for p in dist.rglob("*") if p.is_file()} == set(assets), "Original dist inventory mismatch")
        for name, info in assets.items():
            check(receipt((dist / name).read_bytes()) == pair(info), "Original dist bytes changed: " + name)
        for info in snapshot.values():
            check(receipt(Path(info["path"]).read_bytes()) == pair(info), "Original candidate input changed: " + info["path"])
    print(json.dumps({"archiveVerified": True, "storedFiles": len(manifest["files"]), "exactOriginalPayloads": sum("originalReceipt" in x for x in manifest["files"].values()), "priorReferences": len(manifest["priorArchivedReferences"]), "originalScratchChecked": args.original, "recordedOwnerClosureConsistent": True, "startupAdopted": True, "tubeEntryAccepted": False, "scope": "Read-only storage/gzip/reference and recorded receipt checks; no numerical, native, FPS or tube acceptance rerun."}, indent=2))


if __name__ == "__main__":
    main()
