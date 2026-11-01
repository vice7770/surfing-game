#!/usr/bin/env python3
"""The Canyon's tube runs, end to end: per case a coarse scout, the two phases, the analysis; then the barrel library's
files and a report. tools/basilisk/run_canyon.sh checks the prerequisites and starts this; it can also run on its own:
(TUBE_SET=pool, as tools/basilisk/run_pool.sh sets it: the Wave Pool's Barrel cases instead, the same steps; SETS below.)

  python3 tools/basilisk/canyon_pipeline.py run [-j N] [--smoke]   start or resume (in the foreground)
  python3 tools/basilisk/canyon_pipeline.py status [--smoke]       where each case is, with an ETA
  python3 tools/basilisk/canyon_pipeline.py analyse [--smoke]      the analysis, library and report again, from finished runs

Per case (the cases of the reef-bed notes, docs/research/canyon-reef-bed-2026-10-22/README.md):
  1. scout: run_periodic.sh scout, the whole case at SCOUT_LEVEL (10), every frame written; analysis/crest_track.py finds
     where the second crest's face goes vertical and places the switch, the end and the window (frozen in
     runs/canyon/cases.txt, so a resumed run keeps them);
  2. run_periodic.sh fg: phase 1 at LEVEL1 (10) to the switch, phase 2 at LEVEL2 (13) in the window to the end, each
     compiled once and resumed from its 10-minute checkpoint;
  3. analysis: crest_track.py on both phases (the foot crest, A0, from phase 1; the level-13 break from phase 2), then
     plunge_measure.py and periodic_library.py, as the advisor ran the Padang Padang, Reef and Point cases.
Then `npm run barrels` writes each case with a tube to public/barrels/<id>.bin (the game's case files; nothing lists them
in the game's index yet), the cases' index entries and validation table beside the report, and the report itself:
docs/research/canyon-tube-runs/. Python's standard library only; the analysis scripts it calls need numpy and scipy.
"""
import argparse
import datetime as dt
import json
import math
import os
import platform
import shutil
import signal
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
ANALYSIS = os.path.join(HERE, "analysis")
# Each set of tube runs: its cases (the costliest first), what each sources, its runs' folder, its report's folder, its
# spot, the script that starts it, and its report's words. TUBE_SET picks one (default: the Canyon's, as before).
SETS = {
    "canyon": {
        "cases": ["canyon23_a49", "canyon23_a38", "canyon23_a29"],
        "what": {
            "canyon23_a29": ("x −9 (take-off), planar 1:23", "Medium's sets"),
            "canyon23_a38": ("x −9 (take-off), planar 1:23", "Big's typical wave"),
            "canyon23_a49": ("x −9 (take-off), planar 1:23", "Big's sets"),
        },
        "state": "canyon", "out": "canyon-tube-runs", "spot": "canyon", "script": "run_canyon.sh", "smoke": "canyon23_a29",
        "title": "The Canyon's tube runs", "label": "Canyon",
        "bed": "Each case is a two-crest cnoidal train on the Canyon's reef bed along the wave's path",
        "bed_detail": "Bed: h0 = 6 m, one planar face at 1:23 to 1.0 m (0.167 h0), flat to the closed right wall.",
        "fits": "S1 = 1/23 (the reef-bed README's 0.052–0.059)",
        "foot": "the 6 m foot",
        "wiring": [
            "- The cases' `.bin` files are written but listed in no game index: `src/wave/barrel/barrelLibraryIndex.ts` still "
            "holds the eight shipped cases. Wiring adds them (`npm run barrels` with every shipped case `--keep`ed and these "
            "`--run` from `data/`, `--spot canyon --flat 0.1666667` and each `--a0`), a `canyon` entry in `BARREL_SPOTS` "
            "(slope 1/23, foot 6 m, its join and throw tables: the throw from the depths above), and `canyon` in `SWEPT_BARREL`.",
            "- The arm's face is planar (canyon-long-wave), one transect at every column, so the cases are three A0 of it, "
            "the loft's own key (slope 1/23, A0); down the line the same face carries smaller waves.",
        ],
    },
    "pool": {
        "cases": ["pool_straight_big", "pool_straight_small"],
        "what": {
            "pool_straight_small": ("the straight reef's ray over its barrel section (s 65–175), platform to crest", "Barrel 1.5 m faces"),
            "pool_straight_big": ("the straight reef's ray over its barrel section (s 65–175), platform to crest", "Barrel 1.8 m faces"),
        },
        "state": "pool", "out": "pool-tube-runs", "spot": "pool", "script": "run_pool.sh", "smoke": "pool_straight_small",
        "title": "The Wave Pool's Barrel tube runs", "label": "Wave Pool Barrel",
        "bed": "Each case is a two-crest cnoidal train of the pool's 10 s machine wave on its Barrel straight reef along its ray",
        "bed_detail": "Bed (docs/research/pool-barrel-2026-11-01/README.md, the Basilisk cases): h0 = the platform's depth, "
                      "one planar face along the ray (S1) to the reef crest (HS), flat to the closed right wall.",
        "fits": "S1 = the face's slope along the ray (the solver's measured Mead & Black X)",
        "foot": "the platform (h0)",
        "wiring": [
            "- The cases' `.bin` files are written but listed in no game index: step 3 (the drawing) wires them, "
            "with a `pool` entry in `BARREL_SPOTS` and the Barrel floor's tube on.",
            "- The straight reef is uniform along its barrel section (s 65–175), so one case per size covers it.",
        ],
    },
}
SET_NAME = os.environ.get("TUBE_SET", "canyon")
if SET_NAME not in SETS:
    sys.exit(f"TUBE_SET must be one of {', '.join(SETS)}, not {SET_NAME}")
SET = SETS[SET_NAME]
CASES = SET["cases"]
WHAT = SET["what"]
SCRIPT = SET["script"]
SMOKE_WINDOW = {"tswitch": 1.0, "tmax": 2.0}  # the smoke test's phases: a second of each, at levels 7 and 8
EXTEND = float(os.environ.get("CANYON_EXTEND", 4.0))  # phase 2 carried on this much (sqrt(h0/g)) once, if it broke late


class Config:
    def __init__(self, smoke=False, jobs=None):
        self.smoke = smoke
        env = os.environ
        self.python = env.get("PYTHON", sys.executable)
        self.runs = env.get("RUNS", os.path.join(HERE, "runs", "smoke") if smoke else os.path.join(HERE, "runs"))
        self.level1 = int(env.get("LEVEL1", 7 if smoke else 10))
        self.level2 = int(env.get("LEVEL2", 8 if smoke else 13))
        self.scout_level = int(env.get("SCOUT_LEVEL", 7 if smoke else 10))
        self.scout_tmax = env.get("SCOUT_TMAX", "2" if smoke else "")
        self.cases = env.get("CANYON_CASES" if SET_NAME == "canyon" else "POOL_CASES", SET["smoke"] if smoke else " ".join(CASES)).split()
        self.state = os.path.join(self.runs, SET["state"])
        self.out = env.get("CANYON_OUT", os.path.join(self.state, "smoke-out") if smoke
                           else os.path.join(REPO, "docs", "research", SET["out"]))
        self.assets = env.get("CANYON_ASSETS", os.path.join(self.out, "barrels") if smoke
                              else os.path.join(REPO, "public", "barrels"))
        self.cases_file = os.path.join(self.state, "cases.txt")
        pcores, ram_gb = machine_cores(), machine_ram_gb()
        auto = max(1, min(len(self.cases), pcores, int(ram_gb // 4) or 1))
        self.jobs = jobs or int(env.get("JOBS", 0)) or auto
        self.omp = env.get("OMP", "0") == "1"
        self.threads = max(1, pcores // self.jobs) if self.omp else 1

    def env(self):
        e = dict(os.environ, RUNS=self.runs, LEVEL1=str(self.level1), LEVEL2=str(self.level2),
                 SCOUT_LEVEL=str(self.scout_level), PYTHON=self.python, CASES_FILE=self.cases_file,
                 OMP="1" if self.omp else "0", OMP_NUM_THREADS=str(self.threads))
        if self.scout_tmax:
            e["SCOUT_TMAX"] = self.scout_tmax
        return e

    def dirs(self, name):
        return {"scout": os.path.join(self.runs, f"periodic_{name}_scout_L{self.scout_level}"),
                "p1": os.path.join(self.runs, f"periodic_{name}_p1_L{self.level1}"),
                "p2": os.path.join(self.runs, f"periodic_{name}_L{self.level2}")}

    def run_name(self, name):
        return f"periodic_{name}_L{self.level2}"


def sysctl(key):
    try:
        return subprocess.run(["sysctl", "-n", key], capture_output=True, text=True, timeout=5).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def machine_cores():
    p = sysctl("hw.perflevel0.physicalcpu")
    return int(p) if p.isdigit() else (os.cpu_count() or 1)


def machine_ram_gb():
    m = sysctl("hw.memsize")
    if m.isdigit():
        return int(m) / 2 ** 30
    try:
        return os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / 2 ** 30
    except (ValueError, OSError):
        return 8.0


def machine():
    brand = sysctl("machdep.cpu.brand_string") or platform.processor() or platform.machine()
    return f"{brand}, {sysctl('hw.perflevel0.physicalcpu') or '?'} performance + {sysctl('hw.perflevel1.physicalcpu') or '?'} " \
           f"efficiency cores, {machine_ram_gb():.0f} GB, macOS {platform.mac_ver()[0] or platform.release()}"


def read_params(path):
    out = {}
    if not os.path.exists(path):
        return out
    for line in open(path):
        if "=" in line:
            k, v = line.strip().split("=", 1)
            try:
                out[k] = float(v)
            except ValueError:
                out[k] = v
    return out


def timing(run_dir):
    """timing.log as segments (each process start resets its wall clock): lists of (t, wall, cells, dt)."""
    path = os.path.join(run_dir, "timing.log")
    segs = []
    if not os.path.exists(path):
        return segs
    last = None
    for line in open(path):
        s = line.split()
        if len(s) < 8:
            continue
        try:
            t, d, cells, wall = float(s[4]), float(s[5]), int(s[6]), float(s[7])
        except ValueError:
            continue
        if last is None or wall < last:
            segs.append([])
        segs[-1].append((t, wall, cells, d))
        last = wall
    return segs


def progress(run_dir, tend):
    """t, cells, wall so far and the recent rate (sqrt(h0/g) per wall second, the last 20 minutes) -> ETA, s."""
    segs = timing(run_dir)
    if not segs or not segs[-1]:
        return None
    seg = segs[-1]
    t, wall, cells, _ = seg[-1]
    recent = [r for r in seg if r[1] >= wall - 1200.0]
    a = recent[0] if len(recent) > 1 and recent[-1][1] - recent[0][1] > 60 else seg[0]
    rate = (t - a[0]) / (wall - a[1]) if wall > a[1] else None
    eta = (tend - t) / rate if rate and rate > 0 else None
    total_wall = sum(s[-1][1] for s in segs if s)
    return {"t": t, "tend": tend, "cells": cells, "wall": total_wall, "rate": rate, "eta": eta}


def rel(path):
    """A path as the owner would type it: relative to the repo when inside it."""
    r = os.path.relpath(path, REPO)
    return path if r.startswith("..") else r


def hms(s):
    if s is None or s != s:
        return "?"
    s = int(s)
    return f"{s // 3600}h{(s % 3600) // 60:02d}" if s >= 3600 else f"{s // 60}m{s % 60:02d}s"


class Pipeline:
    def __init__(self, cfg):
        self.cfg = cfg
        self.lock = threading.Lock()
        self.stage = {n: "queued" for n in cfg.cases}
        self.failed = {}
        self.children = set()
        self.stopping = False
        stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
        self.logdir = os.path.join(cfg.state, "logs", stamp)
        os.makedirs(self.logdir, exist_ok=True)
        latest = os.path.join(cfg.state, "logs", "latest")
        try:
            if os.path.islink(latest):
                os.unlink(latest)
            os.symlink(stamp, latest)
        except OSError:
            pass
        self.log_fh = open(os.path.join(self.logdir, "pipeline.log"), "a")

    # ---- logging and processes ----
    def log(self, msg, case=None):
        line = f"{dt.datetime.now().strftime('%Y-%m-%d %H:%M:%S')} {case + ': ' if case else ''}{msg}"
        with self.lock:
            print(line, flush=True)
            self.log_fh.write(line + "\n")
            self.log_fh.flush()

    def sh(self, case, args, cwd=None, env=None):
        """Run a command for a case, its output appended to that case's log; True if it succeeded."""
        if self.stopping:
            return False
        path = os.path.join(self.logdir, f"{case}.log")
        with open(path, "a") as fh:
            fh.write(f"\n$ {' '.join(args)}\n")
            fh.flush()
            p = subprocess.Popen(args, cwd=cwd or HERE, env=env or self.cfg.env(), stdout=fh, stderr=subprocess.STDOUT,
                                 stdin=subprocess.DEVNULL, start_new_session=True)
            with self.lock:
                self.children.add(p)
            rc = p.wait()
            with self.lock:
                self.children.discard(p)
        if rc != 0 and not self.stopping:
            self.log(f"failed (exit {rc}): {' '.join(os.path.basename(a) if a.startswith(HERE) else a for a in args)}; "
                     f"see {path}", case)
        return rc == 0

    def stop(self, *_):
        self.stopping = True
        with self.lock:
            kids = list(self.children)
        for p in kids:
            try:
                os.killpg(p.pid, signal.SIGTERM)
            except OSError:
                pass
        self.log("stopped; rerun to resume (each phase resumes from its last 10-minute checkpoint)")

    def periodic(self, case, *args):
        return self.sh(case, ["bash", os.path.join(HERE, "run_periodic.sh"), *args])

    def py(self, case, script, *args):
        return self.sh(case, [self.cfg.python, os.path.join(ANALYSIS, script), *map(str, args)], cwd=ANALYSIS)

    def wait_orphans(self, name):
        """An earlier supervisor's builds of this case still running (it was killed): wait for them to end. The patterns
        are anchored on the commands as started (./periodic_<case>_p1 in its folder; bash run_periodic.sh fg <case>), so a
        shell that only names those paths (a tail -f on a log) doesn't count."""
        pattern = f"^(/bin/)?bash .*run_periodic\\.sh (fg|scout) {name}$|^\\./periodic_{name}_(scout|p1|p2)( |$)"
        said = False
        while not self.stopping and subprocess.run(["pgrep", "-f", pattern], capture_output=True).returncode == 0:
            if not said:
                self.stage[name] = "waiting for an earlier run"
                self.log("an earlier run of this case is still going; waiting for it to end", name)
                said = True
            time.sleep(2)

    # ---- the cases ----
    def base_line(self, name):
        env = dict(self.cfg.env())
        env.pop("CASES_FILE")
        out = subprocess.run(["bash", os.path.join(HERE, "run_periodic.sh"), "cases", name], capture_output=True,
                             text=True, env=env).stdout.split()
        if not out:
            raise RuntimeError(f"run_periodic.sh has no case {name}")
        return out[0]

    def frozen_line(self, name):
        if os.path.exists(self.cfg.cases_file):
            for line in open(self.cfg.cases_file):
                if line.split(":")[0] == name:
                    return line.strip()
        return None

    def place_window(self, name):
        """The case's switch, end and window, from its scout (frozen once written)."""
        line = self.frozen_line(name)
        if line:
            return line
        f = self.base_line(name).split(":")
        if self.cfg.smoke:
            f[7], f[8], f[9], f[10] = (str(SMOKE_WINDOW["tswitch"]), str(SMOKE_WINDOW["tmax"]), "0",
                                       str(round(float(f[6]) / 2)))
            why = "the smoke test's fixed window"
        else:
            scout = self.cfg.dirs(name)["scout"]
            tr = json.load(open(os.path.join(scout, "track.json"))) if os.path.exists(os.path.join(scout, "track.json")) else {}
            s = tr.get("suggest")
            if s:
                f[7], f[8], f[9], f[10] = (f"{s['tswitch']:g}", f"{s['tmax']:g}", f"{s['xwin0']:g}", f"{s['xwin1']:g}")
                why = (f"scout: face vertical at t {tr['t_vertical']:.2f}, x {tr['x_vertical']:.2f} h0 "
                       f"({tr['depth_vertical_m']:.2f} m still depth)"
                       + (f", touchdown t {tr['t_touchdown']:.2f}" if tr.get("t_touchdown") else ", no touchdown seen")
                       + ("" if tr.get("vertical_found") else f"; {tr.get('note', 'no vertical face')}"))
            else:
                why = f"the scout placed nothing ({tr.get('error', 'no track')}); keeping the provisional window"
        line = ":".join(f)
        with self.lock:
            with open(self.cfg.cases_file, "a") as fh:
                fh.write(f"# {name}: {why}\n{line}\n")
        self.log(f"switch t {f[7]}, end t {f[8]}, window x {f[9]}–{f[10]} h0 ({why})", name)
        return line

    def case(self, name):
        failed = os.path.join(self.cfg.state, f"{name}.failed")
        if os.path.exists(failed):
            os.unlink(failed)
        try:
            self.wait_orphans(name)
            d = self.cfg.dirs(name)
            if not os.path.exists(os.path.join(d["p2"], "done")):
                if not self.frozen_line(name):
                    self.stage[name] = "scout"
                    if not self.periodic(name, "scout", name):
                        raise RuntimeError("the scout failed")
                    self.py(name, "crest_track.py", d["scout"], "--out", os.path.join(d["scout"], "track.json"))
                self.place_window(name)
                self.stage[name] = "phases"
                if not self.periodic(name, "fg", name):
                    raise RuntimeError("a phase failed")
            if self.late(name):
                self.stage[name] = "phases"
                if not self.periodic(name, "fg", name):
                    raise RuntimeError("phase 2's extension failed")
            p2 = d["p2"]
            if os.path.exists(p2 + "_case.json") and os.path.getmtime(p2 + "_case.json") > os.path.getmtime(
                    os.path.join(p2, "done")):
                self.log(f"already analysed ({SCRIPT} analyse redoes it)", name)
            else:
                self.stage[name] = "analysing"
                self.analyse(name)
            self.stage[name] = "done"
            self.log("done", name)
        except Exception as e:  # noqa: BLE001 - one case's failure must not stop the others
            if self.stopping:
                self.stage[name] = "stopped"
                return
            self.stage[name] = "failed"
            self.failed[name] = str(e)
            if not self.stopping:
                self.log(f"FAILED: {e}", name)
                open(failed, "w").write(f"{e}; see {os.path.join(self.logdir, name + '.log')}\n")

    def late(self, name):
        """Phase 2 ended too soon after its own break (finer grids break a little later than the scout): its face went
        vertical with no touchdown in the last EXTEND, or it was still steepening at the end. Then carry phase 2 on by
        EXTEND, once, from its final state: the case's end (and window) move in cases.txt, and its build is redone."""
        cfg, d = self.cfg, self.cfg.dirs(name)
        p1, p2 = d["p1"], d["p2"]
        if cfg.smoke or os.path.exists(os.path.join(p2, "extended")) or not os.path.exists(os.path.join(p2, "final")):
            return False
        self.py(name, "crest_track.py", p1, "--out", os.path.join(p1, "track.json"))
        last = (json.load(open(os.path.join(p1, "track.json"))).get("track") or [None])[-1]
        init = ["--init", f"{last['t']}", f"{last['x']}"] if last else []
        self.py(name, "crest_track.py", p2, *init, "--out", os.path.join(p2, "track.json"))
        tr = json.load(open(os.path.join(p2, "track.json")))
        par = read_params(os.path.join(p2, "params.txt"))
        tmax, rows = par.get("tmax"), tr.get("track") or []
        if not rows or tmax is None:
            return False
        if tr.get("vertical_found"):
            why = (f"its face went vertical at t {tr['t_vertical']:.2f}, with no touchdown by the end, t {tmax:g}"
                   if tr.get("t_touchdown") is None and tr["t_vertical"] > tmax - EXTEND else None)
        else:
            steep = max(rows, key=lambda r: r["angle"])
            why = f"its face was still steepening at the end, t {tmax:g}" if steep["t"] >= rows[-1]["t"] - 1.0 else None
        if not why:
            return False
        f = self.frozen_line(name).split(":")
        f[8] = f"{tmax + EXTEND:g}"
        f[10] = f"{min(float(f[6]), float(f[10]) + EXTEND):g}"
        with self.lock:
            kept = [l for l in open(cfg.cases_file) if l.split(":")[0] != name]
            kept += [f"# {name}: phase 2 carried on to t {f[8]}: {why}\n", ":".join(f) + "\n"]
            open(cfg.cases_file, "w").writelines(kept)
        shutil.copy(os.path.join(p2, "final"), os.path.join(p2, "restart"))
        os.replace(os.path.join(p2, "done"), os.path.join(p2, f"done.t{tmax:g}"))
        for stale in (f"periodic_{name}_p2", "params.txt"):
            if os.path.exists(os.path.join(p2, stale)):
                os.unlink(os.path.join(p2, stale))
        open(os.path.join(p2, "extended"), "w").write(f"{why}; carried on to t {f[8]}, window to x {f[10]}\n")
        self.log(f"{why}: carrying phase 2 on to t {f[8]} (window to x {f[10]} h0), from its final state", name)
        return True

    def analyse(self, name):
        cfg, d = self.cfg, self.cfg.dirs(name)
        p2 = d["p2"]
        par = read_params(os.path.join(p2, "params.txt"))
        if not os.path.exists(os.path.join(p2, "done")):
            raise RuntimeError("phase 2 has not finished")
        # the foot crest (A0) from phase 1, then the level-LEVEL2 break from phase 2, started where phase 1 left it
        self.py(name, "crest_track.py", d["p1"], "--out", os.path.join(d["p1"], "track.json"))
        t1 = json.load(open(os.path.join(d["p1"], "track.json")))
        last = t1["track"][-1] if t1.get("track") else None
        init = ["--init", f"{last['t']}", f"{last['x']}"] if last else []
        self.py(name, "crest_track.py", p2, *init, "--out", os.path.join(p2, "track.json"))
        t2 = json.load(open(os.path.join(p2, "track.json")))
        # the foot crest: the scout's (phase 1's physics at the same level, every 0.1), else phase 1's (every 1.0)
        ts_path = os.path.join(d["scout"], "track.json")
        ts = json.load(open(ts_path)) if os.path.exists(ts_path) else {}
        a0 = ts.get("foot_crest_h0") or t1.get("foot_crest_h0") or t1.get("train_crest_h0")
        a0_from = "scout" if ts.get("foot_crest_h0") else "phase 1" if t1.get("foot_crest_h0") else "train"
        an = t2.get("analysis") or {}
        frames = t2.get("track") or []
        t_first = frames[0]["t"] if frames else par.get("tout0", 0.0)
        t_last = frames[-1]["t"] if frames else par.get("tmax", 0.0)
        t_from, t_to = max(t_first, an.get("t_from", t_first)), min(t_last, an.get("t_to", t_last))
        xmin = an.get("xmin_plunge", (last["x"] - 2.0) if last else 0.0)
        h0, L0 = par["h0"], par["domain"]
        self.py(name, "plunge_measure.py", p2, f"{L0:g}", cfg.level2, f"{h0:g}", f"{t_from:.3f}", f"{t_to:.3f}", f"{xmin:.3f}")
        plunge = json.load(open(p2 + "_plunge.json")) if os.path.exists(p2 + "_plunge.json") else {}
        if os.path.exists(os.path.join(d["p1"], "bed.dat")):  # phase 2 restarts past the step that writes it
            shutil.copy(os.path.join(d["p1"], "bed.dat"), os.path.join(p2, "bed.dat"))
        info = {"a0": a0, "a0_from": a0_from, "tube": False}
        if plunge.get("t_vertical") is not None and plunge.get("t_touchdown") is not None and plunge.get("pre_touchdown"):
            tmin = max(t_first, plunge["t_vertical"] - 3.0)
            rows = [r for r in frames if r["t"] >= tmin - 1e-9]
            xlib = (rows[0]["x"] - 0.5) if rows else xmin
            ok = self.py(name, "periodic_library.py", p2, cfg.level2, f"{L0:g}", f"{par['S1']:g}", f"{a0:.4f}", f"{h0:g}",
                         f"{tmin:.3f}", f"{xlib:.3f}")
            info["tube"] = ok and os.path.exists(p2 + "_library.json")
            if info["tube"] and self.has_matplotlib():
                crest = plunge["pre_touchdown"]["crest_m"]
                self.py(name, "render.py", p2 + "_library.json", p2 + "_strip.png", p2 + "_tube.png", f"{crest:.3f}",
                        f"{SET['label']} {name}, level {cfg.level2}", os.path.join(p2, "bed.dat"))
        else:
            self.log("no tube to build a case from: " + ("the face never went vertical" if plunge.get("t_vertical") is None
                     else "the lip never enclosed air before the end"), name)
        if self.has_matplotlib() and frames and os.path.exists(os.path.join(p2, "bed.dat")):
            tv = plunge.get("t_vertical") or t2.get("t_vertical") or t_first
            times = sorted({round(t_first, 3), round(max(t_first, tv - 1.0), 3), round(tv, 3),
                            round(min(t_last, (plunge.get("t_touchdown") or tv + 1.0)), 3), round(t_last, 3)})
            self.py(name, "train_overview.py", p2, cfg.level2, f"{L0:g}", f"{h0:g}", p2 + "_overview.png", *times)
        json.dump(info, open(p2 + "_case.json", "w"), indent=1)
        self.export(name)

    def has_matplotlib(self):
        if not hasattr(self, "_mpl"):
            self._mpl = subprocess.run([self.cfg.python, "-c", "import matplotlib"], capture_output=True).returncode == 0
            if not self._mpl:
                self.log(f"matplotlib is missing, so no figures (pip install matplotlib, then {SCRIPT} analyse)")
        return self._mpl

    def export(self, name):
        """The case's analysis files beside the report, so the next step can rebuild the cases on any machine."""
        cfg, d = self.cfg, self.cfg.dirs(name)
        run, p2 = cfg.run_name(name), d["p2"]
        data = os.path.join(cfg.out, "data")
        os.makedirs(data, exist_ok=True)
        pairs = [(p2 + "_library.json", f"{run}_library.json"), (p2 + "_metrics.json", f"{run}_metrics.json"),
                 (p2 + "_plunge.json", f"{run}_plunge.json"), (p2 + "_case.json", f"{run}_case.json"),
                 (os.path.join(p2, "track.json"), f"{run}_track.json"),
                 (os.path.join(d["p1"], "track.json"), f"{run}_p1_track.json"),
                 (os.path.join(d["scout"], "track.json"), f"{run}_scout_track.json"),
                 (os.path.join(p2, "params.txt"), f"{run}_params.txt"), (os.path.join(d["p1"], "train.json"), f"{run}_train.json")]
        for src, dst in pairs:
            if os.path.exists(src):
                shutil.copy(src, os.path.join(data, dst))
        for png in ("_strip.png", "_tube.png", "_overview.png"):
            if os.path.exists(p2 + png):
                shutil.copy(p2 + png, os.path.join(cfg.out, run + png))

    # ---- the library and the report ----
    def library(self):
        """Each case with a tube as the game's case file (scripts/barrel-library.ts), its index entry and validation row
        beside the report. The smoke test converts the committed Padang Padang Small-swell library instead, into its own
        folder: the .bin it writes should match public/barrels/periodic-padang19s-l12.bin byte for byte."""
        cfg = self.cfg
        if cfg.smoke:
            runs_dir, built = self.smoke_sample(), [("periodic_padang19s_L12", 0.1414, 0.1785714, "padang")]
        else:
            runs_dir, built = cfg.runs, []
            for name in cfg.cases:
                p2 = cfg.dirs(name)["p2"]
                info = json.load(open(p2 + "_case.json")) if os.path.exists(p2 + "_case.json") else {}
                if info.get("tube"):
                    hs = read_params(os.path.join(p2, "params.txt")).get("HS", 1 / 6)
                    built.append((cfg.run_name(name), info["a0"], hs, SET["spot"]))
        if not built:
            self.log("no case threw a tube, so no barrel case files")
            return False
        if not shutil.which("npm") or not os.path.exists(os.path.join(REPO, "node_modules", ".bin", "rolldown")):
            self.log(f"npm or the repo's node_modules is missing (npm ci), so no barrel case files; then {SCRIPT} analyse")
            return False
        args = ["npm", "run", "--silent", "barrels", "--", "--runs", runs_dir, "--assets", cfg.assets,
                "--index", os.path.join(cfg.out, "barrel-index.json"), "--cases", os.path.join(cfg.out, "barrel-cases.md")]
        for run, a0, hs, spot in built:
            args += ["--run", run, "--spot", f"{run}={spot}", "--a0", f"{run}={a0:.4f}", "--flat", f"{run}={hs:.7f}"]
        ok = self.sh("library", args, cwd=REPO, env=dict(os.environ))
        files = [f"{run.lower().replace('_', '-')}.bin" for run, *_ in built]
        self.log(("wrote " if ok else "could not write ") + ", ".join(files) + f" to {rel(cfg.assets)}")
        if ok and cfg.smoke:
            same = open(os.path.join(cfg.assets, files[0]), "rb").read() == open(
                os.path.join(REPO, "public", "barrels", files[0]), "rb").read()
            self.log(f"the converter check: {files[0]} " + ("matches the committed file byte for byte" if same
                     else "DIFFERS from the committed file"))
            ok = same
        return ok

    def smoke_sample(self):
        src = os.path.join(REPO, "docs", "research", "water-physics", "notes", "round6-tube-profiles", "data")
        folder = os.path.join(self.cfg.state, "smoke-sample")
        os.makedirs(folder, exist_ok=True)
        for kind in ("library", "metrics"):
            name = f"periodic_padang19s_L12_{kind}.json"
            shutil.copy(os.path.join(src, name), os.path.join(folder, name))
        return folder

    def report(self):
        cfg = self.cfg
        rows, summary = [], {"generated": dt.datetime.now().isoformat(timespec="seconds"), "machine": machine(),
                             "levels": {"scout": cfg.scout_level, "phase1": cfg.level1, "phase2": cfg.level2},
                             "basilisk": basilisk_rev(), "cases": {}}
        for name in cfg.cases:
            d = cfg.dirs(name)
            p2 = d["p2"]
            par = read_params(os.path.join(p2, "params.txt"))
            pl = json.load(open(p2 + "_plunge.json")) if os.path.exists(p2 + "_plunge.json") else {}
            info = json.load(open(p2 + "_case.json")) if os.path.exists(p2 + "_case.json") else {}
            lib = json.load(open(p2 + "_library.json")) if os.path.exists(p2 + "_library.json") else {}
            tr = json.load(open(os.path.join(p2, "track.json"))) if os.path.exists(os.path.join(p2, "track.json")) else {}
            walls = {k: sum(s[-1][1] for s in timing(d[k]) if s) for k in ("scout", "p1", "p2")}
            h0 = par.get("h0", 6.0)
            a0 = info.get("a0")
            c = {"what": WHAT.get(name, ("", ""))[1], "transect": WHAT.get(name, ("", ""))[0], "H_over_h0": par.get("H_over_h0"),
                 "period_s": par.get("period"), "S1": par.get("S1"), "S2": par.get("S2"), "HMID": par.get("HMID"),
                 "HS": par.get("HS"), "domain_h0": par.get("domain"), "window": [par.get("xwin0"), par.get("xwin1")],
                 "tswitch": par.get("tout0"), "tmax": par.get("tmax"), "dx_m": par.get("domain", 0) / 2 ** cfg.level2 * h0,
                 "A0": a0, "A0_from": info.get("a0_from"), "foot_crest_m": a0 * h0 if a0 else None,
                 "t_vertical": pl.get("t_vertical"), "t_touchdown": pl.get("t_touchdown"), "tube": info.get("tube", False),
                 "at_vertical": pl.get("at_vertical"), "pre_touchdown": pl.get("pre_touchdown"),
                 "depth_vertical_m": tr.get("depth_vertical_m"), "wall_s": walls, "stage": self.stage.get(name),
                 "library_stats": lib.get("stats")}
            if a0 and par.get("S1"):
                psi = par["S1"] / a0 ** 0.25
                c["psi0"] = psi
                c["fits"] = {"A_O/H2": 5.319 * psi - 0.043, "A_J/H2": 37.072 * psi * psi - 0.587 * psi + 0.020,
                             "W/L": 1.661 * psi + 0.298, "theta_O": -5746.4 * psi * psi + 225.2 * psi + 48.4}
            summary["cases"][name] = c
            rows.append(report_row(name, c))
        os.makedirs(cfg.out, exist_ok=True)
        json.dump(summary, open(os.path.join(cfg.out, "summary.json"), "w"), indent=1, default=float)
        write_report(cfg, summary, rows)
        self.log(f"wrote {rel(os.path.join(cfg.out, 'report.md'))}")

    # ---- status ----
    def status_lines(self):
        return status_lines(self.cfg, self.stage)

    def run(self):
        cfg = self.cfg
        os.makedirs(cfg.state, exist_ok=True)
        pidfile = os.path.join(cfg.state, "pipeline.pid")
        open(pidfile, "w").write(str(os.getpid()))
        signal.signal(signal.SIGTERM, self.stop)
        signal.signal(signal.SIGINT, self.stop)
        signal.signal(signal.SIGHUP, signal.SIG_IGN)
        self.log(f"{SET['title'][0].lower() + SET['title'][1:]}{' (smoke test)' if cfg.smoke else ''}: {', '.join(cfg.cases)}; scout level "
                 f"{cfg.scout_level}, phases {cfg.level1} and {cfg.level2}; {cfg.jobs} at once"
                 + (f", {cfg.threads} OpenMP threads each" if cfg.omp else ", one core each") + f"; {machine()}")
        self.log(f"logs: {self.logdir}")
        t0 = time.time()
        with ThreadPoolExecutor(max_workers=cfg.jobs) as pool:
            futures = [pool.submit(self.case, n) for n in cfg.cases]
            last_log = 0.0
            while not all(f.done() for f in futures):
                time.sleep(2 if cfg.smoke else 15)
                lines = self.status_lines()
                with open(os.path.join(cfg.state, "status.txt"), "w") as fh:
                    fh.write(f"{dt.datetime.now():%Y-%m-%d %H:%M:%S}, {hms(time.time() - t0)} in\n" + "\n".join(lines) + "\n")
                if time.time() - last_log > (60 if cfg.smoke else 600):
                    last_log = time.time()
                    for line in lines:
                        self.log(line)
        if self.stopping:
            return 1
        self.library()
        self.report()
        for line in self.status_lines():
            self.log(line)
        self.log(f"finished in {hms(time.time() - t0)}; report: {rel(os.path.join(cfg.out, 'report.md'))}"
                 + (f"; failed: {', '.join(self.failed)}" if self.failed else ""))
        try:
            os.unlink(pidfile)
        except OSError:
            pass
        return 1 if self.failed else 0

    def analyse_all(self):
        for name in self.cfg.cases:
            if os.path.exists(os.path.join(self.cfg.dirs(name)["p2"], "done")):
                self.stage[name] = "analysing"
                try:
                    self.analyse(name)
                    self.stage[name] = "done"
                except Exception as e:  # noqa: BLE001
                    self.stage[name] = "failed"
                    self.log(f"FAILED: {e}", name)
            else:
                self.log("not finished; skipped", name)
        self.library()
        self.report()


def supervisor_alive(cfg):
    """The pid in runs/<set>/pipeline.pid, if that process is still this supervisor."""
    path = os.path.join(cfg.state, "pipeline.pid")
    try:
        pid = int(open(path).read().strip())
        cmd = subprocess.run(["ps", "-p", str(pid), "-o", "command="], capture_output=True, text=True).stdout
        return pid if "canyon_pipeline" in cmd and pid != os.getpid() else None
    except (OSError, ValueError):
        return None


def basilisk_rev():
    home = os.environ.get("BASILISK_HOME", os.path.expanduser("~/basilisk-C"))
    try:
        return subprocess.run(["git", "-C", home, "log", "-1", "--format=%h %cd", "--date=short"], capture_output=True,
                              text=True, timeout=5).stdout.strip() or "?"
    except (OSError, subprocess.SubprocessError):
        return "?"


PER_LEVEL = 5.5  # phase 2's cost per unit of time over phase 1's, per level between them (the level-12 periodic runs: 30x for 2)


def status_lines(cfg, stage=None):
    """One line per case from the files alone (works whether or not the supervisor runs), then the set's rough ETA."""
    lines, left = [], []
    exists = lambda *p: os.path.exists(os.path.join(*p))  # noqa: E731
    for name in cfg.cases:
        d = cfg.dirs(name)
        st = (stage or {}).get(name)
        if st == "stopped":
            lines.append(f"{name}: stopped (rerun to resume)")
            left.append(None)
            continue
        if st in ("failed", "waiting for an earlier run") or (st is None and exists(cfg.state, f"{name}.failed")):
            why = open(os.path.join(cfg.state, f"{name}.failed")).read().strip() if exists(cfg.state, f"{name}.failed") else ""
            lines.append(f"{name}: {st or 'failed'}{': ' + why if why else ''}")
            left.append(0.0 if st == "failed" or st is None else None)
            continue
        if exists(d["p2"] + "_case.json") and exists(d["p2"], "done") and \
                os.path.getmtime(d["p2"] + "_case.json") > os.path.getmtime(os.path.join(d["p2"], "done")):
            info = json.load(open(d["p2"] + "_case.json"))
            lines.append(f"{name}: analysed ({'a tube' if info.get('tube') else 'no tube'}; A0 {info.get('a0') or 0:.3f})")
            left.append(0.0)
            continue
        if exists(d["p2"], "done"):
            lines.append(f"{name}: phase 2 done, {'analysing' if st == 'analysing' else 'to analyse'}")
            left.append(600.0)
            continue
        if exists(d["p1"], "done"):
            key, label, after = "p2", f"phase 2 (level {cfg.level2})", ""
        elif exists(d["p1"], "timing.log"):
            key, label, after = "p1", f"phase 1 (level {cfg.level1})", "; phase 2 follows"
        elif exists(d["scout"], "done"):
            lines.append(f"{name}: scout done; phase 1 next")
            continue
        elif os.path.isdir(d["scout"]):
            key, label, after = "scout", f"scout (level {cfg.scout_level})", "; phases 1 and 2 follow"
        else:
            lines.append(f"{name}: {st or 'not started'}")
            left.append(None)
            continue
        par = read_params(os.path.join(d[key], "params.txt"))
        pr = progress(d[key], par.get("tmax", float("nan")))
        if pr is None:
            lines.append(f"{name}: {label}: starting")
            left.append(None)
            continue
        rest = pr["eta"]
        if key == "p1" and pr["rate"] and pr["eta"] is not None:
            p2par = read_params(os.path.join(d["p2"], "params.txt"))
            span = p2par.get("tmax", 0) - p2par.get("tout0", 0)
            guess = span / (pr["rate"] / PER_LEVEL ** (cfg.level2 - cfg.level1)) if span > 0 else None
            after = f"; phase 2 then roughly {hms(guess)}" if guess else after
            rest = pr["eta"] + guess + 600.0 if guess else None
        elif key == "p2" and rest is not None:
            rest += 600.0
        else:
            rest = None
        left.append(rest)
        lines.append(f"{name}: {label}: t {pr['t']:.2f} of {pr['tend']:g}, {pr['cells']} cells, wall {hms(pr['wall'])}, "
                     f"this phase's ETA {hms(pr['eta'])}{after}")
    if left and all(v == 0.0 for v in left):
        lines.append("the set: done")
    elif left and all(v is not None for v in left):
        busy = max(1, min(cfg.jobs, len(left)))
        lines.append(f"the set: about {hms(max(max(left), sum(left) / busy))} left, with the analysis "
                     "(rough until every case is in phase 2: the per-phase ETAs extrapolate the last 20 minutes)")
    else:
        lines.append("the set: an ETA once every case has finished its scout")
    return lines


def fmt(v, digits=2, unit=""):
    return "—" if v is None else f"{v:.{digits}f}{unit}"


def report_row(name, c):
    pre, atv, fits = c.get("pre_touchdown") or {}, c.get("at_vertical") or {}, c.get("fits") or {}
    per = pre.get("per H at vertical", {})
    lib = c.get("library_stats") or {}
    clean = " / ".join(f"{v['clean']}/{v['n']}" for k, v in sorted((lib.get("by_phase") or {}).items(),
                                                                   key=lambda kv: ["pre", "open", "post"].index(kv[0])))
    return "| " + " | ".join([
        f"`{name}`", f"{c['transect']}; {c['what']}", f"{fmt(c.get('H_over_h0'))} at {fmt(c.get('period_s'), 0)} s",
        f"{fmt(c.get('A0'), 3)} ({fmt(c.get('foot_crest_m'))} m, {c.get('A0_from') or '—'})",
        f"t {fmt(c.get('t_vertical'))}, x {fmt(atv.get('x_m'), 1)} m, {fmt(c.get('depth_vertical_m'))} m deep",
        f"{fmt(atv.get('H_m'))} m ({fmt(atv.get('crest_m'))}, {fmt(atv.get('trough_m'))})",
        "yes" if c.get("tube") else "no", fmt(pre.get("open_s")),
        f"{fmt(per.get('jet'), 3)} ({fmt(fits.get('A_J/H2'), 3)})", f"{fmt(per.get('tube'), 3)} ({fmt(fits.get('A_O/H2'), 3)})",
        f"{fmt(pre.get('L/W'))} ({fmt(1 / fits['W/L'] if fits.get('W/L') else None)})",
        f"{fmt(pre.get('tilt_deg'), 0)}° ({fmt(fits.get('theta_O'), 0)}°)",
        f"{fmt(pre.get('lip_m'))} m, {fmt(pre.get('lip_cells'), 1)}", clean or "—",
        " / ".join(hms(c["wall_s"].get(k)) if c["wall_s"].get(k) else "—" for k in ("scout", "p1", "p2")),
    ]) + " |"


def write_report(cfg, summary, rows):
    out = os.path.join(cfg.out, "report.md")
    built = [n for n, c in summary["cases"].items() if c.get("tube")]
    lines = [
        f"# {SET['title']}" + (" (smoke test)" if cfg.smoke else ""),
        "",
        f"Generated by `tools/basilisk/{SCRIPT}` on {summary['generated']} ({summary['machine']}; Basilisk "
        f"{summary['basilisk']}). {SET['bed']} "
        "(`tools/basilisk/run_periodic.sh`), the second crest studied: a scout at level "
        f"{cfg.scout_level} placed the switch and the window, phase 1 ran at level {cfg.level1} and phase 2 at level "
        f"{cfg.level2} inside the window. {SET['bed_detail']} Numbers are [measured] in the model.",
        "",
        "| Case | Transect; what | H/h0 at T | A0, the foot crest (m; from) | Face vertical | H at vertical (crest, trough ahead) | Tube | "
        "Open, vertical to touchdown (s) | Jet A_J/H² (fit) | Tube A_O/H² (fit) | L/W (fit) | Tilt (fit) | Lip, cells across | "
        "Clean frames pre / open / post | Wall: scout / p1 / p2 |",
        "|" + "---|" * 15,
        *rows,
        "",
        "- **Per H at vertical:** H is crest minus the trough ahead at the frame the face goes vertical (`plunge_measure.py`), "
        "the height the game sizes its jets with; the jet and tube are just before touchdown (the last overturned frame with "
        "the jet at least 3 cells off the face).",
        f"- **Fits:** Pick & Feddersen's, at ψ0 = S1/A0^¼ with {SET['fits']}, as "
        "`scripts/barrel-library.ts` takes them. They are plane-slope fits; Padang Padang's reef cases ran under them in area.",
        "- **Cells across the lip:** basilisk-profiles.md's rule asks for about 6. Under 4, rerun phase 2 one level finer "
        f"(`LEVEL2=14 tools/basilisk/{SCRIPT}`; phase 1 is reused).",
        f"- **A0** is the second crest's height as it passes {SET['foot']} (phase 1, interpolated), the key the swept barrel "
        "blends cases by; `train` means the foot crest wasn't tracked and the cnoidal train's crest stands in.",
        "",
        "## Files",
        "",
        f"- `data/`: per case, `periodic_<case>_L{cfg.level2}_library.json` (the 128-point profiles, `periodic_library.py`), "
        "`_metrics.json` and `_plunge.json` (the times and the tube, `plunge_measure.py`), `_track.json`, `_p1_track.json` and "
        "`_scout_track.json` (the second crest, `crest_track.py`), `_params.txt` and `_train.json`.",
        "- `barrel-index.json` and `barrel-cases.md`: the cases' index entries and validation table, from `npm run barrels`"
        f" (written for {', '.join(f'`{n}`' for n in built) if built else 'no case'}); their files are in "
        f"`{rel(cfg.assets)}`.",
        "- `summary.json`: every number above. Figures (`*_strip.png`, `*_tube.png`, `*_overview.png`) when matplotlib was there.",
        "",
        "## For the swept barrel's wiring",
        "",
        *SET["wiring"],
    ]
    open(out, "w").write("\n".join(lines) + "\n")


def main():
    ap = argparse.ArgumentParser(description=SET["title"])
    ap.add_argument("cmd", nargs="?", default="run", choices=["run", "status", "analyse"])
    ap.add_argument("-j", "--jobs", type=int)
    ap.add_argument("--smoke", action="store_true")
    a = ap.parse_args()
    cfg = Config(smoke=a.smoke, jobs=a.jobs)
    if a.cmd == "status":
        alive = supervisor_alive(cfg)
        print(f"The supervisor is running (pid {alive})." if alive else f"The supervisor is not running ({SCRIPT} resumes it).")
        for line in status_lines(cfg):
            print(line)
        return 0
    os.makedirs(cfg.state, exist_ok=True)
    other = supervisor_alive(cfg)
    if other:
        print(f"The supervisor is already running (pid {other}); see {SCRIPT} status.")
        return 1
    p = Pipeline(cfg)
    if a.cmd == "analyse":
        p.analyse_all()
        return 0
    return p.run()


if __name__ == "__main__":
    sys.exit(main())
