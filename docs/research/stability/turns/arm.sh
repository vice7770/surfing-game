#!/bin/zsh
# 3.6b: one arm's evidence (README §3). Usage: arm.sh <name> <scratch dir>
#   needs <s>/rep/q-<name>, <s>/rep/f-<name> (report runs), <s>/his-<name> (probe, his-way set), <s>/onset-off
n=$1; S=$2; T=${0:A:h}; B=$T/..
echo "## quick: ride lines against baseline-quick"; python3 $T/same.py $S/rep/q-$n/rides.jsonl $B/baseline-quick.json
echo "## full: ride lines against baseline-full"; [ -f $S/rep/f-$n/rides.jsonl ] && python3 $T/same.py $S/rep/f-$n/rides.jsonl $B/baseline-full.json
echo "## pass lines (steer-only from the report runs, his way from the probe)"
on=($S/rep/f-$n); [ -f $S/rep/f-$n/rides.jsonl ] || on=($S/rep/q-$n)
[ -d $S/his-$n ] && on+=($S/his-$n)
python3 $T/compare.py --on ${on[@]} --off $S/onset-off --twins $S/onset-off --md $S/pass-$n.md
