import json,sys
d=json.load(open(sys.argv[1])); label=sys.argv[2] if len(sys.argv)>2 else ''
for x in d:
    t=x['turn']; f=x['fan']
    print(f"{label:14} {x['case']:24} fell {str(x['fell']):5} | by .6/.8/1 {t['at06']}/{t['at08']}/{t['at10']} end {t['end']} pk {t['peak']} on {t['onset']} span {t['span']} {t['spanTurn']}° mean {t['spanMean']} 1s-from-on {t['onset1s']} | fin {t['finMax']} slip {t['slipTime']} [{t['firstSlip']}->{t['regrip']}] roll(slip) {t['rollInSlip']} max {t['rollMax']} | kept1 {t['kept1']} least {t['least']} drift {t['driftMax']} nose {t['noseMax']}")
    print(f"{'':14} {'':24} fan kg {f['kg']} (>=10: {f['kgAt10']} in {f['at10s']} s) pk {f['peakFlux']} kg/s | aft apex {f['aftApex']} m @{f['aftApexAt']} root {f['rootAft']} mean {f['meanFrom']} m from tail | drawn p95 {f['drawn95']} max {f['drawnMax']} | off hd {f['offHeading']} path {f['offPath']} elev {f['elevation']} spread {f['spread']}")
