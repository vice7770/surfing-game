#!/usr/bin/env python3
"""Verify archived bytes; --external also checks SHA-bound historical inputs.

This performs file bookkeeping only. It does not import the game, launch a
browser, simulate water, compile sources, or execute archived test files.
"""
from pathlib import Path
import argparse
import gzip
import hashlib
import json
import struct
import zlib


def digest(data):
    return hashlib.sha256(data).hexdigest()


def exact(data, length, sha, label):
    if len(data) != length or digest(data) != sha:
        raise ValueError(f"Byte/hash mismatch: {label}")


def rgba_from_png(data, width, height):
    """Decode the retained harness's RGBA8/filter-0 PNG, reverse rows exactly."""
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("Invalid PNG signature")
    at, compressed, header, ended = 8, [], None, False
    while at < len(data):
        if at + 12 > len(data):
            raise ValueError("Truncated PNG chunk")
        length = struct.unpack_from(">I", data, at)[0]
        kind = data[at + 4:at + 8]
        payload = data[at + 8:at + 8 + length]
        end = at + 12 + length
        if end > len(data):
            raise ValueError("Truncated PNG payload")
        crc = struct.unpack_from(">I", data, at + 8 + length)[0]
        if zlib.crc32(kind + payload) & 0xffffffff != crc:
            raise ValueError("PNG CRC mismatch")
        if kind == b"IHDR":
            if header is not None or length != 13:
                raise ValueError("Invalid PNG header")
            header = struct.unpack(">IIBBBBB", payload)
        elif kind == b"IDAT":
            compressed.append(payload)
        elif kind == b"IEND":
            if length != 0 or end != len(data):
                raise ValueError("Invalid PNG end")
            ended = True
        at = end
    if header != (width, height, 8, 6, 0, 0, 0) or not ended:
        raise ValueError("Unexpected PNG format")
    scan = zlib.decompress(b"".join(compressed))
    stride = width * 4
    if len(scan) != height * (stride + 1):
        raise ValueError("Unexpected PNG scanline size")
    rows = []
    for y in range(height):
        offset = y * (stride + 1)
        if scan[offset] != 0:
            raise ValueError("Unexpected PNG filter")
        rows.append(scan[offset + 1:offset + 1 + stride])
    return b"".join(reversed(rows))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--external", action="store_true")
    args = parser.parse_args()
    base = Path(__file__).resolve().parent
    manifest_bytes = (base / "manifest.json").read_bytes()
    manifest = json.loads(manifest_bytes)
    aliases = 0
    for record in manifest["records"]:
        path = base / record["storedPath"]
        if not path.resolve().is_relative_to(base):
            raise ValueError("Stored path escapes archive")
        if path.name.endswith(".test.ts"):
            raise ValueError("Live Vitest filename in archive")
        stored = path.read_bytes()
        exact(stored, record["storedBytes"], record["storedSha256"], str(path))
        if record["storage"] == "gzip-mtime0":
            if stored[:3] != b"\x1f\x8b\x08" or stored[3] != 0 or stored[4:8] != b"\0\0\0\0":
                raise ValueError("Non-deterministic gzip header")
            raw = gzip.decompress(stored)
        elif record["storage"] == "raw":
            raw = stored
        else:
            raise ValueError("Unknown storage format")
        exact(raw, record["expandedBytes"], record["expandedSha256"], str(path) + " expanded")
        for alias in record["originalAliases"]:
            exact(raw, alias["bytes"], alias["sha256"], alias["path"])
            aliases += 1
    decoded = {}
    for record in manifest["derivedRGBA"]:
        key = (record["pngStoredPath"], record["width"], record["height"])
        if key not in decoded:
            decoded[key] = rgba_from_png((base / key[0]).read_bytes(), key[1], key[2])
        exact(decoded[key], record["bytes"], record["sha256"], record.get("originalPath") or record["kind"])
    for record in manifest.get("generatedFiles", []):
        exact((base / record["path"]).read_bytes(), record["bytes"], record["sha256"], record["path"])
    checked = 0
    if args.external:
        cache = {}
        for record in manifest["externalReferences"]:
            if "verificationStoredPath" in record:
                path = base / record["verificationStoredPath"]
                key = str(path) + ":expanded"
                if key not in cache:
                    data = path.read_bytes()
                    if record["verificationStorage"] == "gzip-mtime0":
                        data = gzip.decompress(data)
                    cache[key] = (len(data), digest(data))
                if cache[key] != (record["bytes"], record["sha256"]):
                    raise ValueError(f"Archived historical reference mismatch: {record['originalPath']}")
                checked += 1
                continue
            path = record["verificationPath"]
            if path not in cache:
                data = Path(path).read_bytes()
                cache[path] = (len(data), digest(data))
            if cache[path] != (record["bytes"], record["sha256"]):
                raise ValueError(f"External mismatch: {record['originalPath']} via {path}")
            checked += 1
    live = [str(p.relative_to(base)) for p in base.rglob("*.test.ts")]
    if live:
        raise ValueError(f"Live Vitest filenames: {live}")
    print(json.dumps({
        "status": "passed", "manifestSha256": digest(manifest_bytes),
        "storedPayloads": len(manifest["records"]), "originalAliases": aliases,
        "derivedRGBA": len(manifest["derivedRGBA"]), "uniqueDecodedPNGs": len(decoded),
        "externalChecked": checked, "liveTestFiles": 0,
        "operation": "archive byte/hash verification only"
    }, indent=2))


if __name__ == "__main__":
    main()
