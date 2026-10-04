#!/usr/bin/env python3
"""Verify preserved bytes and recorded closure; never execute archived drivers."""
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


def decoded(path, encoding):
    data = path.read_bytes()
    return gzip.decompress(data) if encoding == "gzip" else data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--original", action="store_true", help="Also read and hash original scratch files; no execution")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    manifest = json.loads((root / "manifest.json").read_text())
    for name, expected in manifest["files"].items():
        path = root / name
        require(receipt(path.read_bytes()) == expected["transportReceipt"], "archive bytes: " + name)
        if "originalReceipt" in expected:
            require(receipt(decoded(path, expected["encoding"])) == expected["originalReceipt"], "gzip/original bytes: " + name)
    for name, expected in manifest["references"].items():
        path = root / name
        require(receipt(path.read_bytes()) == expected["transportReceipt"], "prior reference bytes: " + name)
        require(receipt(decoded(path, expected["encoding"])) == expected["originalReceipt"], "prior reference decoded bytes: " + name)

    load = lambda name: json.loads((root / name).read_text())
    owner = load("native-first-owner.json")
    prep = load("preparation.json")
    report = json.loads(gzip.decompress((root / "report.json.gz").read_bytes()))
    ndjson = gzip.decompress((root / "steps.ndjson.gz").read_bytes())
    rows = [json.loads(line) for line in ndjson.splitlines()]
    require(rows == report["steps"], "NDJSON and report step records differ")
    require(len(rows) == report["stepCount"] == owner["captureValidation"]["ndjsonRows"] == 395, "recorded step count")
    require(report["source"] == prep, "embedded preparation receipt")
    require(report["complete"] and report["firstFailure"] is None, "recorded capture result")
    require(owner["complete"] and owner["exitCode"] == 0 and owner["firstFailure"] is None and not owner["failures"], "recorded owner result")
    require(owner["independentClosureValid"] and not owner["remainingOwnedPids"], "recorded owner closure")
    require(owner["closedPorts"] == {"4291": True, "9701": True}, "recorded owned port closure")
    require(owner["userPortsOpenBefore"] == owner["userPortsOpenAfter"] == {"4310": True, "4311": True}, "recorded user port preservation")
    require(owner["userServersStayedOpen"] and owner["copiedDistUnchanged"] and owner["diagnosticSourcesUnchanged"], "recorded source/server preservation")
    require(owner["elapsedSeconds"] <= owner["wholeSeconds"] == 180 and owner["cleanupElapsedSeconds"] <= owner["cleanupSeconds"] == 7, "recorded owner deadlines")
    require(report["videoTrigger"] is None and report["video"] is None and report["videoRequests"] == [], "recorded optional movie absent")
    require(report["entry"]["firstPartial"] is None and report["entry"]["firstConnectedWitnessEntry"] is None and report["entry"]["maximumConsecutiveContainedSteps"] == 0, "recorded no entry")
    require(not report["entry"]["fullBodyClearancePass"] and not owner["captureValidation"]["captureCompletionIsEntryPass"], "capture is not entry/clearance pass")
    require(all(row["loft"]["indices"] == 0 and row["ride"]["wave"]["crestBreaking"] == 0 for row in rows), "recorded absent loft/breaking")
    require(len(report["checkpoints"]) == 2, "recorded checkpoint count")
    for checkpoint in report["checkpoints"]:
        inventory = checkpoint["frontInventory"]
        require(inventory["raw"]["recordCount"] == 0 and inventory["raw"]["stride"] == 9 and inventory["raw"]["fieldOffsets"] == {"id": 2, "sigma": 3, "tau": 4}, "recorded raw front inventory")
        require(inventory["drawn"]["indexCount"] == 0, "recorded drawn inventory")
    validation = owner["captureValidation"]
    for artifact in validation["artifactReceipts"]:
        path = root / artifact["file"]
        data = gzip.decompress((root / "steps.ndjson.gz").read_bytes()) if artifact["file"] == "steps.ndjson" else path.read_bytes()
        require(receipt(data) == {key: artifact[key] for key in ("bytes", "sha256")}, "owner artifact bytes: " + artifact["file"])
        if artifact["file"].endswith(".png"):
            require(data.startswith(b"\x89PNG\r\n\x1a\n"), "original PNG signature")
    require(validation["pngCount"] == 2 and validation["pngBytes"] == 4037533 and validation["reportBytes"] == len(gzip.decompress((root / "report.json.gz").read_bytes())), "recorded artifact sizes")
    prior = json.loads((root / manifest["assetReferences"]["priorPreparation"]).read_text())
    require(prep["assets"] == prior["assets"] and len(prep["assets"]) == 49, "49 unchanged asset receipts")
    require(prep["diagnosticAssets"] == prior["diagnosticAssets"], "unchanged diagnostic bundle receipt")
    bundle = gzip.decompress((root / manifest["assetReferences"]["diagnosticBundle"]).read_bytes())
    require(receipt(bundle) == prep["diagnosticAssets"]["diagnostic-autopilot.mjs"], "referenced bundle bytes")
    require(receipt(gzip.decompress((root / "production-source-frozen.json.gz").read_bytes())) == {key: prep["productionInputs"]["frozenBeforeLaterSourceWork"][key] for key in ("bytes", "sha256")}, "production input snapshot")
    require(prep["productionInputs"]["frozenBeforeLaterSourceWork"]["sha256"] == prep["productionInputs"]["afterPreparation"]["sha256"], "recorded identical production snapshots")
    require(len(json.loads(gzip.decompress((root / "production-source-frozen.json.gz").read_bytes()))) == prep["productionInputs"]["count"] == 328, "recorded production input count")
    for name, expected in prep["diagnosticSources"].items():
        archived = "source/original-README.md.gz" if name == "README.md" else "source/browser-cdp.mjs.gz" if name == "browser-cdp" else name if name.endswith(".json") else "source/" + name + ".gz"
        data = decoded(root / archived, "gzip" if archived.endswith(".gz") else "identity")
        require(receipt(data) == {key: expected[key] for key in ("bytes", "sha256")}, "prepared diagnostic source bytes: " + name)
    checks = load("source-checks.json")
    require(checks["complete"] and checks["sourceOnly"] and len(checks["checks"]) == 90, "recorded source-only checks")

    if args.original:
        inventory = load("scratch-inventory.json")
        original = Path(inventory["root"])
        actual = {str(path.relative_to(original)): receipt(path.read_bytes()) for path in sorted(original.rglob("*")) if path.is_file()}
        require(actual == inventory["files"], "complete original scratch inventory")
        for expected in manifest["files"].values():
            if "original" in expected:
                for name in [expected["original"]] + expected.get("identicalOriginals", []):
                    require(receipt(Path(name).read_bytes()) == expected["originalReceipt"], "original file bytes: " + name)
        for expected in manifest["references"].values():
            require(receipt(Path(expected["gentleOriginal"]).read_bytes()) == expected["originalReceipt"], "original reference bytes")
    print(json.dumps({"scope": "Archive bytes, gzip transport, stored receipt consistency, and recorded owner closure only; no native/numerical rerun or entry/adoption pass", "archiveFilesVerified": len(manifest["files"]), "priorReferencesVerified": len(manifest["references"]), "originalScratchVerified": args.original, "recordedSteps": len(rows), "originalPngBytes": validation["pngBytes"], "recordedOwnerClosureValid": True, "entryPass": False, "adoptionPass": False}, indent=2))


if __name__ == "__main__":
    main()
