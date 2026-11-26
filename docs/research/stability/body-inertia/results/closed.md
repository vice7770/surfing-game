# 3.6g question 2: the pictures closed with the shipped design

*Closed sets passing over 1.5 s at ≥ 4 m/s, Canyon Big seeds 1–3 (fitting) and 4–5 (held-out); a unit kick at m = 0, 90 ticks (1.5 s); read-outs on Ω (the board's world-up yaw rate) over m = 1 … 90: Prony's dominant mode in 1.5–5 Hz, the damped sinusoid, the envelope ratio (3rd period over 1st), the waveform error on Ω and on the seven senses; the controller the shipped perturbation map (designs built on P_two). Speed-following = the picture at each tick's own speed, depth and rail; frozen = at the kick tick's.*

## Compress (91 closed sets: fitting 66, held-out 25)

| group: closure | sets | Prony f, median | f − f_twin, median paired | waveform error Ω, median | senses, median | Prony ζ, median | damped-sinusoid ζ, median | envelope ratio, median | reproduces | rings as the game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **fitting: the closed twins** | 66 | 2.56 | | | | 0.033 | -0.033 | 0.94 | | |
| fitting: P_two (J sourced, feet roll on), speed-following | 66 | 2.28 | -0.25 | 0.98 | 0.95 | 0.577 | 0.100 | 0.14 | no | no |
| fitting: P_two (J sourced, feet roll on), frozen | 66 | 2.74 | 0.25 | 0.99 | 0.95 | 0.731 | 0.106 | 0.26 | no | no |
| fitting: P_0 (J = 0, feet roll on), speed-following | 66 | 2.02 | -0.54 | 1.28 | 1.27 | 0.041 | -0.042 | 0.75 | no | yes |
| fitting: P_0 (J = 0, feet roll on), frozen | 66 | 2.04 | -0.55 | 1.29 | 1.24 | 0.041 | -0.041 | 0.72 | no | yes |
| fitting: P_control (pre-3.4a), speed-following | 66 | 2.03 | -0.51 | 1.44 | 1.38 | 0.016 | -0.053 | 0.95 | no | yes |
| fitting: P_control (pre-3.4a), frozen | 66 | 2.05 | -0.53 | 1.44 | 1.39 | 0.014 | -0.055 | 0.89 | no | yes |
| fitting: J × 0.25, speed-following | 66 | 1.83 | -0.75 | 1.06 | 1.03 | 0.165 | 0.027 | 0.23 | no | no |
| fitting: J × 0.25, frozen | 66 | 1.86 | -0.71 | 1.05 | 1.03 | 0.169 | 0.028 | 0.22 | no | no |
| fitting: J × 0.5, speed-following | 66 | 1.65 | -0.83 | 1.01 | 0.99 | 0.321 | 0.069 | 0.04 | no | no |
| fitting: J × 0.5, frozen | 66 | 1.68 | -0.89 | 1.01 | 0.99 | 0.310 | 0.068 | 0.04 | no | no |
| fitting: J × 2, speed-following | 66 | 2.89 | 0.36 | 0.97 | 0.93 | 0.452 | 0.250 | 0.17 | no | no |
| fitting: J × 2, frozen | 66 | 2.95 | 0.45 | 0.97 | 0.93 | 0.471 | 0.254 | 0.15 | no | no |
| **heldout: the closed twins** | 25 | 2.50 | | | | 0.026 | -0.039 | 0.90 | | |
| heldout: P_two (J sourced, feet roll on), speed-following | 25 | 2.23 | -0.27 | 0.99 | 0.96 | 0.572 | 0.112 | 0.09 | no | no |
| heldout: P_two (J sourced, feet roll on), frozen | 25 | 2.66 | 0.15 | 0.99 | 0.96 | 0.727 | 0.127 | 0.25 | no | no |
| heldout: P_0 (J = 0, feet roll on), speed-following | 25 | 2.02 | -0.50 | 1.30 | 1.23 | 0.039 | -0.041 | 0.76 | no | yes |
| heldout: P_0 (J = 0, feet roll on), frozen | 25 | 2.01 | -0.53 | 1.23 | 1.21 | 0.058 | -0.035 | 0.62 | no | yes |
| heldout: P_control (pre-3.4a), speed-following | 25 | 2.04 | -0.49 | 1.42 | 1.38 | 0.013 | -0.053 | 0.96 | no | yes |
| heldout: P_control (pre-3.4a), frozen | 25 | 2.03 | -0.52 | 1.31 | 1.29 | 0.025 | -0.050 | 0.80 | no | yes |
| heldout: J × 0.25, speed-following | 25 | 1.84 | -0.71 | 1.06 | 1.03 | 0.166 | 0.019 | 0.24 | no | no |
| heldout: J × 0.25, frozen | 25 | 1.83 | -0.71 | 1.04 | 1.03 | 0.177 | 0.027 | 0.20 | no | no |
| heldout: J × 0.5, speed-following | 25 | 1.66 | -0.77 | 1.01 | 1.01 | 0.340 | 0.060 | 0.05 | no | no |
| heldout: J × 0.5, frozen | 25 | 1.65 | -0.91 | 1.01 | 1.00 | 0.321 | 0.077 | 0.04 | no | no |
| heldout: J × 2, speed-following | 25 | 2.92 | 0.46 | 0.98 | 0.94 | 0.439 | 0.250 | 0.17 | no | no |
| heldout: J × 2, frozen | 25 | 2.82 | 0.29 | 0.98 | 0.96 | 0.476 | 0.232 | 0.15 | no | no |
| **pooled: the closed twins** | 91 | 2.54 | | | | 0.033 | -0.036 | 0.91 | | |
| pooled: P_two (J sourced, feet roll on), speed-following | 91 | 2.27 | -0.26 | 0.98 | 0.96 | 0.576 | 0.112 | 0.13 | no | no |
| pooled: P_two (J sourced, feet roll on), frozen | 91 | 2.73 | 0.23 | 0.99 | 0.96 | 0.730 | 0.127 | 0.26 | no | no |
| pooled: P_0 (J = 0, feet roll on), speed-following | 91 | 2.02 | -0.53 | 1.30 | 1.26 | 0.040 | -0.042 | 0.76 | no | **yes** |
| pooled: P_0 (J = 0, feet roll on), frozen | 91 | 2.03 | -0.54 | 1.28 | 1.22 | 0.048 | -0.041 | 0.68 | no | yes |
| pooled: P_control (pre-3.4a), speed-following | 91 | 2.04 | -0.50 | 1.42 | 1.38 | 0.015 | -0.053 | 0.95 | no | **yes** |
| pooled: P_control (pre-3.4a), frozen | 91 | 2.05 | -0.52 | 1.42 | 1.35 | 0.021 | -0.052 | 0.85 | no | yes |
| pooled: J × 0.25, speed-following | 91 | 1.83 | -0.74 | 1.06 | 1.03 | 0.166 | 0.019 | 0.23 | no | no |
| pooled: J × 0.25, frozen | 91 | 1.85 | -0.71 | 1.05 | 1.03 | 0.173 | 0.028 | 0.21 | no | no |
| pooled: J × 0.5, speed-following | 91 | 1.65 | -0.80 | 1.01 | 0.99 | 0.327 | 0.068 | 0.05 | no | no |
| pooled: J × 0.5, frozen | 91 | 1.68 | -0.90 | 1.01 | 0.99 | 0.313 | 0.077 | 0.04 | no | no |
| pooled: J × 2, speed-following | 91 | 2.91 | 0.39 | 0.97 | 0.93 | 0.446 | 0.250 | 0.17 | no | no |
| pooled: J × 2, frozen | 91 | 2.95 | 0.37 | 0.97 | 0.94 | 0.473 | 0.249 | 0.15 | no | no |

- pooled Ω power peak: the twins 2.53 Hz

## tuck (80 closed sets: fitting 61, held-out 19)

| group: closure | sets | Prony f, median | f − f_twin, median paired | waveform error Ω, median | senses, median | Prony ζ, median | damped-sinusoid ζ, median | envelope ratio, median | reproduces | rings as the game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **fitting: the closed twins** | 61 | 2.73 | | | | 0.060 | 0.000 | 0.71 | | |
| fitting: P_two (J sourced, feet roll on), speed-following | 61 | 2.90 | 0.19 | 0.99 | 0.92 | 0.591 | 0.204 | 0.20 | no | no |
| fitting: P_two (J sourced, feet roll on), frozen | 61 | 3.32 | 0.62 | 0.99 | 0.91 | 0.654 | 0.188 | 0.22 | no | no |
| fitting: P_0 (J = 0, feet roll on), speed-following | 61 | 2.16 | -0.51 | 1.09 | 0.99 | 0.122 | 0.055 | 0.34 | no | no |
| fitting: P_0 (J = 0, feet roll on), frozen | 61 | 2.17 | -0.56 | 1.07 | 1.00 | 0.121 | 0.060 | 0.32 | no | no |
| fitting: P_control (pre-3.4a), speed-following | 61 | 2.20 | -0.47 | 1.13 | 1.00 | 0.099 | 0.044 | 0.42 | no | no |
| fitting: P_control (pre-3.4a), frozen | 61 | 2.20 | -0.53 | 1.10 | 1.01 | 0.096 | 0.045 | 0.39 | no | no |
| fitting: J × 0.25, speed-following | 61 | 1.89 | -0.75 | 1.05 | 0.94 | 0.219 | 0.115 | 0.13 | no | no |
| fitting: J × 0.25, frozen | 61 | 1.93 | -0.80 | 1.05 | 0.95 | 0.214 | 0.115 | 0.13 | no | no |
| fitting: J × 0.5, speed-following | 61 | 1.70 | -0.92 | 1.01 | 0.91 | 0.336 | 0.145 | 0.04 | no | no |
| fitting: J × 0.5, frozen | 61 | 1.75 | -0.97 | 1.02 | 0.92 | 0.324 | 0.156 | 0.03 | no | no |
| fitting: J × 2, speed-following | 61 | 2.74 | 0.10 | 0.97 | 0.91 | 0.512 | 0.261 | 0.16 | no | no |
| fitting: J × 2, frozen | 61 | 2.74 | 0.42 | 0.97 | 0.90 | 0.570 | 0.262 | 0.12 | no | no |
| **heldout: the closed twins** | 19 | 2.71 | | | | 0.043 | -0.006 | 0.72 | | |
| heldout: P_two (J sourced, feet roll on), speed-following | 19 | 3.10 | 0.40 | 0.99 | 0.91 | 0.528 | 0.038 | 0.19 | no | no |
| heldout: P_two (J sourced, feet roll on), frozen | 19 | 3.20 | 0.55 | 1.00 | 0.93 | 0.678 | 0.029 | 0.26 | no | no |
| heldout: P_0 (J = 0, feet roll on), speed-following | 19 | 2.19 | -0.50 | 1.13 | 0.97 | 0.115 | 0.037 | 0.37 | no | no |
| heldout: P_0 (J = 0, feet roll on), frozen | 19 | 2.12 | -0.58 | 1.13 | 0.98 | 0.130 | 0.046 | 0.30 | no | no |
| heldout: P_control (pre-3.4a), speed-following | 19 | 2.22 | -0.48 | 1.17 | 1.01 | 0.093 | 0.027 | 0.43 | no | no |
| heldout: P_control (pre-3.4a), frozen | 19 | 2.16 | -0.54 | 1.17 | 1.02 | 0.096 | 0.036 | 0.40 | no | no |
| heldout: J × 0.25, speed-following | 19 | 1.94 | -0.74 | 1.05 | 0.94 | 0.204 | 0.026 | 0.14 | no | no |
| heldout: J × 0.25, frozen | 19 | 1.90 | -0.82 | 1.06 | 0.94 | 0.214 | 0.039 | 0.12 | no | no |
| heldout: J × 0.5, speed-following | 19 | 1.76 | -0.93 | 1.03 | 0.93 | 0.335 | 0.027 | 0.04 | no | no |
| heldout: J × 0.5, frozen | 19 | 1.76 | -0.92 | 1.04 | 0.94 | 0.324 | 0.018 | 0.04 | no | no |
| heldout: J × 2, speed-following | 19 | 2.71 | 0.17 | 0.98 | 0.90 | 0.511 | 0.254 | 0.13 | no | no |
| heldout: J × 2, frozen | 19 | 2.57 | -0.14 | 0.99 | 0.90 | 0.734 | 0.258 | 0.15 | no | no |
| **pooled: the closed twins** | 80 | 2.73 | | | | 0.054 | 0.000 | 0.72 | | |
| pooled: P_two (J sourced, feet roll on), speed-following | 80 | 2.90 | 0.20 | 0.99 | 0.92 | 0.587 | 0.195 | 0.19 | no | no |
| pooled: P_two (J sourced, feet roll on), frozen | 80 | 3.28 | 0.57 | 1.00 | 0.91 | 0.656 | 0.188 | 0.22 | no | no |
| pooled: P_0 (J = 0, feet roll on), speed-following | 80 | 2.18 | -0.51 | 1.11 | 0.98 | 0.120 | 0.053 | 0.35 | no | no |
| pooled: P_0 (J = 0, feet roll on), frozen | 80 | 2.17 | -0.57 | 1.08 | 0.99 | 0.121 | 0.059 | 0.32 | no | no |
| pooled: P_control (pre-3.4a), speed-following | 80 | 2.21 | -0.48 | 1.14 | 1.00 | 0.096 | 0.043 | 0.43 | no | no |
| pooled: P_control (pre-3.4a), frozen | 80 | 2.19 | -0.53 | 1.12 | 1.01 | 0.096 | 0.044 | 0.39 | no | no |
| pooled: J × 0.25, speed-following | 80 | 1.92 | -0.74 | 1.05 | 0.94 | 0.218 | 0.108 | 0.13 | no | no |
| pooled: J × 0.25, frozen | 80 | 1.93 | -0.80 | 1.06 | 0.95 | 0.214 | 0.105 | 0.13 | no | no |
| pooled: J × 0.5, speed-following | 80 | 1.73 | -0.92 | 1.02 | 0.92 | 0.335 | 0.144 | 0.04 | no | no |
| pooled: J × 0.5, frozen | 80 | 1.75 | -0.95 | 1.03 | 0.93 | 0.324 | 0.143 | 0.03 | no | no |
| pooled: J × 2, speed-following | 80 | 2.74 | 0.11 | 0.97 | 0.90 | 0.511 | 0.259 | 0.16 | no | no |
| pooled: J × 2, frozen | 80 | 2.61 | 0.32 | 0.98 | 0.90 | 0.702 | 0.261 | 0.12 | no | no |

- pooled Ω power peak: the twins 2.80 Hz

## tall (115 closed sets: fitting 73, held-out 42)

| group: closure | sets | Prony f, median | f − f_twin, median paired | waveform error Ω, median | senses, median | Prony ζ, median | damped-sinusoid ζ, median | envelope ratio, median | reproduces | rings as the game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **fitting: the closed twins** | 73 | 2.24 | | | | 0.057 | -0.032 | 0.75 | | |
| fitting: P_two (J sourced, feet roll on), speed-following | 73 | 2.33 | 0.05 | 0.94 | 0.93 | 0.597 | 0.101 | 0.13 | no | no |
| fitting: P_two (J sourced, feet roll on), frozen | 73 | 2.39 | 0.12 | 0.94 | 0.93 | 0.804 | 0.100 | 0.15 | no | no |
| fitting: P_0 (J = 0, feet roll on), speed-following | 73 | 1.88 | -0.37 | 1.39 | 1.26 | 0.035 | -0.088 | 0.82 | no | yes |
| fitting: P_0 (J = 0, feet roll on), frozen | 73 | 1.89 | -0.37 | 1.24 | 1.17 | 0.029 | -0.089 | 0.82 | no | yes |
| fitting: P_control (pre-3.4a), speed-following | 73 | 1.89 | -0.35 | 1.55 | 1.46 | 0.007 | -0.098 | 1.07 | no | yes |
| fitting: P_control (pre-3.4a), frozen | 73 | 1.90 | -0.35 | 1.42 | 1.32 | 0.001 | -0.105 | 1.06 | no | yes |
| fitting: J × 0.25, speed-following | 73 | 1.74 | -0.51 | 1.02 | 0.98 | 0.180 | -0.019 | 0.22 | no | no |
| fitting: J × 0.25, frozen | 73 | 1.75 | -0.51 | 1.01 | 0.98 | 0.172 | -0.010 | 0.23 | no | no |
| fitting: J × 0.5, speed-following | 73 | 1.61 | -0.58 | 0.98 | 0.96 | 0.361 | 0.042 | 0.04 | no | no |
| fitting: J × 0.5, frozen | 73 | 1.60 | -0.65 | 0.98 | 0.96 | 0.342 | 0.058 | 0.04 | no | no |
| fitting: J × 2, speed-following | 73 | 3.05 | 0.89 | 0.95 | 0.93 | 0.452 | 0.278 | 0.15 | no | no |
| fitting: J × 2, frozen | 73 | 3.13 | 0.91 | 0.95 | 0.93 | 0.457 | 0.278 | 0.15 | no | no |
| **heldout: the closed twins** | 42 | 2.23 | | | | 0.059 | -0.033 | 0.80 | | |
| heldout: P_two (J sourced, feet roll on), speed-following | 42 | 2.23 | 0.10 | 0.95 | 0.93 | 0.587 | 0.110 | 0.11 | no | no |
| heldout: P_two (J sourced, feet roll on), frozen | 42 | 2.30 | 0.07 | 0.95 | 0.93 | 0.801 | 0.116 | 0.13 | no | no |
| heldout: P_0 (J = 0, feet roll on), speed-following | 42 | 1.88 | -0.36 | 1.37 | 1.28 | 0.041 | -0.076 | 0.75 | no | yes |
| heldout: P_0 (J = 0, feet roll on), frozen | 42 | 1.89 | -0.34 | 1.32 | 1.28 | 0.062 | -0.072 | 0.61 | no | yes |
| heldout: P_control (pre-3.4a), speed-following | 42 | 1.89 | -0.34 | 1.50 | 1.42 | 0.012 | -0.089 | 0.99 | no | yes |
| heldout: P_control (pre-3.4a), frozen | 42 | 1.90 | -0.34 | 1.46 | 1.39 | 0.027 | -0.089 | 0.81 | no | yes |
| heldout: J × 0.25, speed-following | 42 | 1.73 | -0.51 | 1.11 | 1.12 | 0.188 | -0.010 | 0.20 | no | no |
| heldout: J × 0.25, frozen | 42 | 1.75 | -0.49 | 1.11 | 1.11 | 0.199 | -0.010 | 0.17 | no | no |
| heldout: J × 0.5, speed-following | 42 | 1.59 | -0.61 | 1.00 | 1.02 | 0.373 | 0.049 | 0.04 | no | no |
| heldout: J × 0.5, frozen | 42 | 1.59 | -0.65 | 1.00 | 1.04 | 0.360 | 0.054 | 0.03 | no | no |
| heldout: J × 2, speed-following | 42 | 3.08 | 0.85 | 0.94 | 0.92 | 0.431 | 0.270 | 0.15 | no | no |
| heldout: J × 2, frozen | 42 | 3.03 | 0.83 | 0.94 | 0.92 | 0.464 | 0.256 | 0.15 | no | no |
| **pooled: the closed twins** | 115 | 2.24 | | | | 0.057 | -0.033 | 0.76 | | |
| pooled: P_two (J sourced, feet roll on), speed-following | 115 | 2.30 | 0.09 | 0.95 | 0.93 | 0.597 | 0.101 | 0.13 | no | no |
| pooled: P_two (J sourced, feet roll on), frozen | 115 | 2.35 | 0.09 | 0.95 | 0.93 | 0.803 | 0.100 | 0.14 | no | no |
| pooled: P_0 (J = 0, feet roll on), speed-following | 115 | 1.88 | -0.36 | 1.37 | 1.26 | 0.038 | -0.081 | 0.80 | no | **yes** |
| pooled: P_0 (J = 0, feet roll on), frozen | 115 | 1.89 | -0.36 | 1.28 | 1.18 | 0.037 | -0.081 | 0.75 | no | yes |
| pooled: P_control (pre-3.4a), speed-following | 115 | 1.89 | -0.34 | 1.51 | 1.46 | 0.009 | -0.097 | 1.03 | no | **yes** |
| pooled: P_control (pre-3.4a), frozen | 115 | 1.90 | -0.35 | 1.42 | 1.36 | 0.008 | -0.097 | 0.98 | no | yes |
| pooled: J × 0.25, speed-following | 115 | 1.73 | -0.51 | 1.02 | 0.99 | 0.184 | -0.018 | 0.20 | no | no |
| pooled: J × 0.25, frozen | 115 | 1.75 | -0.50 | 1.01 | 0.98 | 0.180 | -0.010 | 0.20 | no | no |
| pooled: J × 0.5, speed-following | 115 | 1.60 | -0.60 | 0.99 | 0.96 | 0.366 | 0.049 | 0.04 | no | no |
| pooled: J × 0.5, frozen | 115 | 1.59 | -0.65 | 0.98 | 0.97 | 0.349 | 0.058 | 0.04 | no | no |
| pooled: J × 2, speed-following | 115 | 3.07 | 0.86 | 0.94 | 0.93 | 0.446 | 0.277 | 0.15 | no | no |
| pooled: J × 2, frozen | 115 | 3.10 | 0.86 | 0.94 | 0.93 | 0.459 | 0.273 | 0.15 | no | no |

- pooled Ω power peak: the twins 2.17 Hz
