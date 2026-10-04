# Precision-v2 frozen outcome — rejected as complete provider

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
    "valid": 1224,
    "invalid": 0,
    "failures": {},
    "finite": true,
    "anchorsOutsideExact": true,
    "beforeCrossed": 23,
    "afterCrossed": 2,
    "cleanToCrossed": 0,
    "pairIncrease": 0,
    "newPairs": 0,
    "maximumTurn": 66.80140948635182,
    "capFloorPenetrations": 0,
    "capFloorRange": [
      4.742667078971863e-05,
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
    "valid": 3648,
    "invalid": 0,
    "failures": {},
    "finite": true,
    "anchorsOutsideExact": true,
    "beforeCrossed": 64,
    "afterCrossed": 4,
    "cleanToCrossed": 0,
    "pairIncrease": 0,
    "newPairs": 0,
    "maximumTurn": 63.43494882292201,
    "capFloorPenetrations": 0,
    "capFloorRange": [
      3.907829523086548e-06,
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
    "maximumTurn": 49.24962053523256,
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
  "attempted": 342,
  "valid": 303,
  "invalid": 39,
  "failures": {
    "bounded_root_no_radius_above_half_sheet_thickness": 17,
    "bounded_root_nonpositive_available_depth": 22
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
    1.1920928955078125e-07
  ],
  "phases": {
    "retired": 48,
    "retiring": 167,
    "forming": 100,
    "sealing": 27
  },
  "allCollapsedEnvelopeBoundsWithinUnchangedBudget": true,
  "maximumCollapsedControlBound": 0.0002442675825969345,
  "maximumBoundOverBudgetFraction": 0.4944688159038305,
  "switchPairs": 20,
  "switchValid": false,
  "maximumSwitchPerIndexDisplacement": 0.003878801274189092,
  "maximumSampledContourSwitchDistance": 0.00028769049249757344
}

The `allCollapsedEnvelopeBoundsWithinUnchangedBudget` output aggregates only valid returned contours; it does not erase invalid samples. Any nonzero budget failures remain failures.

All39 added-query failures are early formation in the unchanged resolved v1 branch; requested thickness is16,739–200,282 times smaller than8ULP and bounded root cannot fit. See causal-formation-analysis.json. Retirement/current-envelope remedy itself succeeds. The original evaluator distance-helper adapter error and its exact repair are preserved in measurement-repair.json; no recipe/query/tolerance change.
