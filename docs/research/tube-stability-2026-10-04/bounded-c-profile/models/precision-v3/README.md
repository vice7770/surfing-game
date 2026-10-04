# Precision-v3 frozen outcome — rejected as complete provider

All frozen inputs/recipe/evaluator files remain unchanged. Root authorized each separate structural formulation; no coefficients were tuned. Source was NOT ported. Native helpers/production/user dist untouched.

Original grid outcome: {
  "captured": {
    "attempted": 5,
    "valid": 5,
    "invalid": 0,
    "failures": {},
    "finite": true,
    "anchorsOutsideExact": true,
    "beforeCrossed": 0,
    "afterCrossed": 0,
    "cleanToCrossed": 0,
    "pairIncrease": 0,
    "newPairs": 0,
    "maximumTurn": 22.90776910635385,
    "capFloorPenetrations": 0,
    "capFloorRange": [
      0.21738940477371216,
      0.22319306433200836
    ],
    "phases": {
      "open": 4,
      "sealing": 1
    }
  },
  "all1224Frames": {
    "attempted": 1224,
    "valid": 1223,
    "invalid": 1,
    "failures": {
      "precision_collapse_exceeds_declared_spatial_budget": 1
    },
    "finite": true,
    "anchorsOutsideExact": true,
    "beforeCrossed": 23,
    "afterCrossed": 2,
    "cleanToCrossed": 0,
    "pairIncrease": 0,
    "newPairs": 0,
    "maximumTurn": 47.72631099390627,
    "capFloorPenetrations": 0,
    "capFloorRange": [
      0.0001435842778947649,
      0.04713251144825451
    ],
    "phases": {
      "ordinary": 872,
      "forming": 138,
      "open": 210,
      "sealing": 4
    }
  },
  "all3648AdjacentF32": {
    "attempted": 3648,
    "valid": 3641,
    "invalid": 7,
    "failures": {
      "precision_collapse_exceeds_declared_spatial_budget": 7
    },
    "finite": true,
    "anchorsOutsideExact": true,
    "beforeCrossed": 64,
    "afterCrossed": 4,
    "cleanToCrossed": 0,
    "pairIncrease": 0,
    "newPairs": 0,
    "maximumTurn": 38.41805534482199,
    "capFloorPenetrations": 0,
    "capFloorRange": [
      0.0001445859670639038,
      0.047093722969293594
    ],
    "phases": {
      "ordinary": 2604,
      "forming": 418,
      "open": 626
    }
  },
  "continuousPhaseGrid": {
    "attempted": 376,
    "valid": 376,
    "invalid": 0,
    "failures": {},
    "finite": true,
    "anchorsOutsideExact": true,
    "beforeCrossed": 0,
    "afterCrossed": 0,
    "cleanToCrossed": 0,
    "pairIncrease": 0,
    "newPairs": 0,
    "maximumTurn": 42.53346163721884,
    "capFloorPenetrations": 0,
    "capFloorRange": [
      0.0,
      0.04404365457594395
    ],
    "phases": {
      "ordinary": 24,
      "forming": 56,
      "open": 104,
      "sealing": 26,
      "retiring": 71,
      "retired": 95
    }
  },
  "parameterCrossCaseGrid": {
    "attempted": 672,
    "valid": 672,
    "invalid": 0,
    "failures": {},
    "finite": true,
    "anchorsOutsideExact": true,
    "beforeCrossed": 0,
    "afterCrossed": 0,
    "cleanToCrossed": 0,
    "pairIncrease": 0,
    "newPairs": 0,
    "maximumTurn": 36.59710975941648,
    "capFloorPenetrations": 0,
    "capFloorRange": [
      0.0,
      0.04266459122300148
    ],
    "phases": {
      "ordinary": 84,
      "forming": 168,
      "open": 252,
      "retiring": 65,
      "retired": 84,
      "sealing": 19
    }
  },
  "captured113Width125Pass": true,
  "captured160Width125Pass": true,
  "consumerReady": false,
  "nativeAdopted": false
}

Additional precision outcome: {
  "attempted": 522,
  "valid": 483,
  "invalid": 39,
  "failures": {
    "precision_collapse_exceeds_declared_spatial_budget": 39
  },
  "finite": true,
  "anchorsOutsideExact": true,
  "beforeCrossed": 0,
  "afterCrossed": 0,
  "cleanToCrossed": 0,
  "pairIncrease": 0,
  "newPairs": 0,
  "maximumTurn": 112.87366519062671,
  "capFloorPenetrations": 0,
  "capFloorRange": [
    0.0,
    0.0009431000798940659
  ],
  "phases": {
    "retired": 48,
    "retiring": 257,
    "forming": 190,
    "sealing": 27
  },
  "allCollapsedEnvelopeBoundsWithinUnchangedBudget": true,
  "maximumCollapsedControlBound": 0.00035256793885290896,
  "maximumBoundOverBudgetFraction": 0.7137003174830612,
  "switchPairs": 40,
  "switchValid": false,
  "maximumSwitchPerIndexDisplacement": 0.008808134790197953,
  "maximumSampledContourSwitchDistance": 0.000732392210425426
}

The `allCollapsedEnvelopeBoundsWithinUnchangedBudget` output aggregates only valid returned contours; it does not erase invalid samples. Any nonzero budget failures remain failures.

The8ULP requested-thickness gate removes all resolved-root failures, but39 added precision queries +1assetframe +7adjacentF32 queries exceed unchanged spatial budget. All failures are early formation floor tail-control movement, outer control movement0. The collapsed roof tangent substituted into floor tail differs byO(g), despite sheet thicknessO(g²). See failure-summary.json. No budget relaxation.
