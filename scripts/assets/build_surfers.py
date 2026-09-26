"""Builds the G7 surfers with MPFB 2 in headless Blender and exports raw GLBs.

Run:  /Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/assets/build_surfers.py [-- surfer1 ...]
Needs the MPFB extension (extensions.blender.org, enabled) and the MakeHuman CC0
system asset pack (surfers.json "pack"; downloaded from "packUrl" if missing).

MPFB calls used (MPFB build 20260722 under Blender 5.2), as found on this install:
- the pack installs by extracting its zip into LocationService.get_user_data(), as mpfb.load_pack does;
- HumanService.create_human(macro_detail_dict=…, scale=0.1) builds a body in metres, feet on the ground;
- HumanService.add_builtin_rig(basemesh, "mixamo") loads data/rigs/standard/rig.mixamo.json and its weights;
- HumanService.set_character_skin(mhmat, basemesh, bodyproxy=…, skin_type="GAMEENGINE") gives image-texture
  materials that glTF exports;
- HumanService.add_mhclo_asset(path, basemesh, asset_type=…, subdiv_levels=0, material_type=…) fits eyes, brows,
  lashes, hair and the low-poly proxy body (LOD1) and rigs them to the armature;
- TargetService.bake_targets(basemesh) bakes the macro shape keys into the mesh before export.
"""
import json
import os
import sys
import urllib.request
import zipfile

import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
with open(os.path.join(ROOT, "scripts/assets/surfers.json")) as handle:
    RECIPES = json.load(handle)
OUT = os.path.join(ROOT, "scripts/assets/.build")
MAX_TEXTURE = 2048
os.makedirs(OUT, exist_ok=True)

from bl_ext.blender_org.mpfb.services.assetservice import AssetService  # noqa: E402
from bl_ext.blender_org.mpfb.services.humanservice import HumanService  # noqa: E402
from bl_ext.blender_org.mpfb.services.locationservice import LocationService  # noqa: E402
from bl_ext.blender_org.mpfb.services.targetservice import TargetService  # noqa: E402


def ensure_pack():
    if AssetService.system_assets_pack_is_installed():
        return
    pack = os.path.join(ROOT, RECIPES["pack"])
    if not os.path.exists(pack):
        os.makedirs(os.path.dirname(pack), exist_ok=True)
        urllib.request.urlretrieve(RECIPES["packUrl"], pack)
    with zipfile.ZipFile(pack) as archive:
        archive.extractall(LocationService.get_user_data())
    AssetService.update_all_asset_lists()


def asset(kind, name, ext):
    path = AssetService.find_asset_absolute_path(f"{name}/{name}.{ext}", kind)
    if not path:
        raise SystemExit(f"missing {kind}/{name}/{name}.{ext} in the MakeHuman asset pack")
    return path


def fit(path, basemesh, asset_type, material):
    return HumanService.add_mhclo_asset(path, basemesh, asset_type=asset_type, subdiv_levels=0, material_type=material)


def build(recipe):
    bpy.ops.wm.read_homefile(use_empty=True)
    basemesh = HumanService.create_human(macro_detail_dict=recipe["macros"], scale=0.1)
    rig = HumanService.add_builtin_rig(basemesh, RECIPES["rig"])
    fit(asset("eyes", "high-poly", "mhclo"), basemesh, "Eyes", "GAMEENGINE")
    fit(asset("eyebrows", recipe["eyebrows"], "mhclo"), basemesh, "Eyebrows", "GAMEENGINE")
    fit(asset("eyelashes", recipe["eyelashes"], "mhclo"), basemesh, "Eyelashes", "GAMEENGINE")
    fit(asset("hair", recipe["hair"], "mhclo"), basemesh, "Hair", "GAMEENGINE")
    proxy = fit(asset("proxymeshes", recipe["proxy"], "proxy"), basemesh, "Proxymeshes", "NONE")
    HumanService.set_character_skin(asset("skins", recipe["skin"], "mhmat"), basemesh, bodyproxy=proxy, skin_type="GAMEENGINE")
    TargetService.bake_targets(basemesh)
    basemesh.name = "LOD0"
    proxy.name = "LOD1"
    rig.name = "Armature"
    # Textures at most 2048 px, written as WebP by the exporter (npm gltfpack has no texture codecs).
    for image in bpy.data.images:
        width, height = image.size
        if max(width, height) > MAX_TEXTURE:
            factor = MAX_TEXTURE / max(width, height)
            image.scale(round(width * factor), round(height * factor))
    path = os.path.join(OUT, f"{recipe['id']}.glb")
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", use_visible=False, export_yup=True, export_apply=True,
        export_skins=True, export_animations=False, export_morph=False, export_tangents=False,
        export_image_format="WEBP", export_image_quality=85, export_materials="EXPORT",
    )
    return {"id": recipe["id"], "file": f"surfers/{recipe['id']}.glb", "sex": recipe["sex"],
            "skin": recipe["skin"], "hair": recipe["hair"], "lods": ["LOD0", "LOD1"]}


def main():
    wanted = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ensure_pack()
    manifest_path = os.path.join(OUT, "surfers.json")
    previous = {}
    if os.path.exists(manifest_path):
        with open(manifest_path) as handle:
            previous = {s["id"]: s for s in json.load(handle)["surfers"]}
    built = {recipe["id"]: build(recipe) for recipe in RECIPES["surfers"] if not wanted or recipe["id"] in wanted}
    # A partial rebuild keeps the other surfers' entries, in the recipes' order.
    merged = [built.get(r["id"], previous.get(r["id"])) for r in RECIPES["surfers"]]
    with open(manifest_path, "w") as handle:
        json.dump({"surfers": [s for s in merged if s]}, handle, indent=2)
    print("BUILT", list(built))


main()
