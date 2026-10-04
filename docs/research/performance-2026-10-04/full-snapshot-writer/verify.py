#!/usr/bin/env python3
"""Archive-only byte/hash verification; no game imports or private commands."""
from pathlib import Path
import argparse
import gzip
import hashlib
import json


def sha(data):
    return hashlib.sha256(data).hexdigest()


def check(data, length, digest, label):
    if (len(data), sha(data)) != (length, digest):
        raise ValueError(f"Byte/hash mismatch: {label}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--external", action="store_true")
    args = parser.parse_args()
    base = Path(__file__).resolve().parent
    raw_manifest = (base / "manifest.json").read_bytes()
    manifest = json.loads(raw_manifest)
    aliases = 0
    listed = set()
    for record in manifest["records"]:
        listed.add(record["storedPath"])
        path = base / record["storedPath"]
        if not path.resolve().is_relative_to(base):
            raise ValueError("Stored path escapes archive")
        stored = path.read_bytes()
        check(stored, record["storedBytes"], record["storedSha256"], str(path))
        if record["storage"] == "gzip-mtime0":
            if stored[:4] != b"\x1f\x8b\x08\x00" or stored[4:8] != b"\0\0\0\0":
                raise ValueError("Unexpected gzip metadata")
            expanded = gzip.decompress(stored)
        elif record["storage"] == "raw":
            expanded = stored
        else:
            raise ValueError("Unknown storage format")
        check(expanded, record["expandedBytes"], record["expandedSha256"], str(path) + " expanded")
        for alias in record["originalAliases"]:
            check(expanded, alias["bytes"], alias["sha256"], alias["path"])
            aliases += 1
    actual = {str(f.relative_to(base)) for f in (base / "evidence").rglob("*") if f.is_file()}
    if listed != actual:
        raise ValueError("Unlisted or missing evidence files")
    for pattern in ["*.test.ts", "*.test.mjs"]:
        if list(base.rglob(pattern)):
            raise ValueError("Live test filename in archive")
    for record in manifest["generatedFiles"]:
        check((base / record["path"]).read_bytes(), record["bytes"], record["sha256"], record["path"])
    external = 0
    cache = {}
    if args.external:
        for record in manifest["externalReferences"]:
            archived = "verificationStoredPath" in record
            path = str(base / record["verificationStoredPath"]) if archived else record["verificationPath"]
            key = (path, archived)
            if key not in cache:
                data = Path(path).read_bytes()
                if archived and record["verificationStorage"] == "gzip-mtime0":
                    data = gzip.decompress(data)
                cache[key] = (len(data), sha(data))
            if cache[key] != (record["bytes"], record["sha256"]):
                raise ValueError(f"External mismatch: {record['originalPath']}")
            external += 1
        for record in manifest.get("externalLinks", []):
            path = Path(record["path"])
            if not path.is_symlink() or str(path.readlink()) != record["target"]:
                raise ValueError(f"External link mismatch: {path}")
    print(json.dumps({"status": "passed", "manifestSha256": sha(raw_manifest),
        "storedPayloads": len(manifest["records"]), "originalAliases": aliases,
        "externalChecked": external, "externalLinksChecked": len(manifest.get("externalLinks", [])) if args.external else 0,
        "liveTestFiles": 0, "unlistedEvidenceFiles": 0,
        "operation": "archive byte/hash bookkeeping only"}, indent=2))


if __name__ == "__main__":
    main()
