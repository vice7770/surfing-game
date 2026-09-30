/**
   Breakline, 2026-09-30: periodic.c, a 2D two-phase train of cnoidal waves
   shoaling and overturning on a piecewise-linear bed. It is slope.c (round 6)
   with the solitary wave replaced by a wave train read from ./train.dat (x,
   eta, deta/dx on a uniform grid, from analysis/cnoidal_train.py), so the wave
   studied breaks into its predecessor's trough. The velocity keeps slope.c's
   long-wave form, u = c eta/(1 + eta), with c = TRAIN_C. It dumps ./final at
   TMAX, so a finer build can restart from it (copied to ./restart), and with
   XWIN0/XWIN1 keeps its finest two levels inside that window. slope.c follows: a
   solitary wave shoaling and overturning on a
   piecewise-linear bed. Adapted from W. Mostert's sandbox/wmostert/shallow.c
   (Mostert & Deike 2020, JFM 890 A12): same equations (centred NS, two-phase,
   momentum-conserving VOF, surface tension, reduced gravity), same
   Green-Naghdi soliton initial condition, same "beach as a zero-velocity
   water-filled fraction" bed, same adaptation criteria. Changes: the bed is
   deep flat (depth 1) -> slope S1 to depth HMID -> slope S2 to depth HS ->
   flat HS (Pick & Feddersen 2026's reef-flat domain when HMID = HS), the
   interface is written as VOF facets (output_facets) every DTOUT, and a
   timing log is kept. Units: h0 = 1, g = 1.
   It checkpoints to ./restart every 10 minutes of wall time and resumes from
   it when restarted in the same directory.
   Licence: GNU GPL version 3 (see COPYING in this folder). Basilisk is
   GPL-3.0 (its src/COPYING) and this file is a derivative of its sandbox code.
*/
#include "grid/quadtree.h"
#include "navier-stokes/centered.h"
#include "two-phase.h"
#include "navier-stokes/conserving.h"
#include "tension.h"
#include "reduced.h"
#include <sys/time.h>

#ifndef LEVEL
#define LEVEL 11
#endif
#ifndef S1
#define S1 (1./15.)
#endif
#ifndef HMID
#define HMID 0.05
#endif
#ifndef S2
#define S2 S1
#endif
#ifndef HS
#define HS 0.05
#endif
#ifndef A0
#define A0 0.6
#endif
#ifndef XTOE
#define XTOE 15.0
#endif
#ifndef XW
#define XW 7.0
#endif
#ifndef DOMAIN
#define DOMAIN 40.0
#endif
#ifndef TMAX
#define TMAX 30.0
#endif
#ifndef TOUT0
#define TOUT0 0.0
#endif
#ifndef DTOUT
#define DTOUT 0.025
#endif
#ifndef BO
#define BO 1000.0
#endif
#ifndef RE
#define RE 40000.0
#endif
#define RATIO (1.0/850.0)
#define MURATIO (17.4e-6/8.9e-4)

double yOffset_ = 0.5;
scalar beach[];
scalar fbb[];
scalar * tracers = {fbb};

double wall0;
double wallclock() { struct timeval tv; gettimeofday(&tv, NULL); return tv.tv_sec + 1e-6*tv.tv_usec; }

/** Bed elevation (still water at y = 0, deep bed at y = -1). */
double bedProfile (double x) {
  double x1 = XTOE + (1.0 - HMID)/S1;      // end of first slope
  double x2 = x1 + (HMID - HS)/S2;          // end of second slope
  if (x < XTOE) return -1.0;
  if (x < x1) return -1.0 + S1*(x - XTOE);
  if (x < x2) return -HMID + S2*(x - x1);
  return -HS;
}

int main() {
  size (DOMAIN);
  origin (0.0, -1.0 - yOffset_);
  rho1 = 1.0; rho2 = RATIO;
  mu1 = 1.0/RE; mu2 = 1.0/RE*MURATIO;
  f.sigma = 1.0/BO;
  init_grid (1 << (LEVEL - 4));
  G.y = -1.0;
#ifndef DTMAX
#define DTMAX 0.02
#endif
  DT = DTMAX;
  wall0 = wallclock();
  run();
}

event set_beach (i = 0; i++) {
  fraction (beach, bedProfile(x) - y);
  foreach()
    foreach_dimension()
      u.x[] = (1.0 - beach[])*u.x[];
}

event updatef (i = 20) {
  foreach() { fbb[] = beach[]; f[] = min(1., f[] + fbb[]); }
}

#ifndef TRAIN_C
#define TRAIN_C 1.0
#endif
static double * trainEta_ = NULL, * trainDeta_ = NULL;
static int trainN_ = 0;
static double trainDx_ = 0.002;

static void readTrain (void) {
  FILE * fp = fopen ("train.dat", "r");
  if (!fp) { fprintf (stderr, "periodic.c: no train.dat\n"); exit (1); }
  int cap = 1 << 16;
  trainEta_ = malloc (cap*sizeof(double)); trainDeta_ = malloc (cap*sizeof(double));
  double x, e, d, x0 = 0., x1 = 0.;
  while (fscanf (fp, "%lf %lf %lf", &x, &e, &d) == 3) {
    if (trainN_ == cap) {
      cap *= 2;
      trainEta_ = realloc (trainEta_, cap*sizeof(double));
      trainDeta_ = realloc (trainDeta_, cap*sizeof(double));
    }
    if (trainN_ == 0) x0 = x;
    if (trainN_ == 1) x1 = x;
    trainEta_[trainN_] = e; trainDeta_[trainN_] = d; trainN_++;
  }
  fclose (fp);
  trainDx_ = x1 - x0;
  fprintf (stderr, "periodic.c: %d train rows, dx %g, c %g\n", trainN_, trainDx_, TRAIN_C);
}

static double trainAt (const double * a, double x) {
  double s = x/trainDx_;
  int i = (int) floor (s);
  if (i < 0) return a[0];
  if (i >= trainN_ - 1) return 0.;
  double w = s - i;
  return (1. - w)*a[i] + w*a[i + 1];
}

event init (i = 0) {
  if (restore (file = "restart")) {
    fprintf (stderr, "restored at t=%g i=%d\n", t, i);
    return 0;
  }
  readTrain();
  double c = TRAIN_C;
  int n = 0;
  do {
    fraction (f, trainAt (trainEta_, x) - y);
    fraction (beach, bedProfile(x) - y);
    foreach() {
      double eta = trainAt (trainEta_, x);
      double deta = trainAt (trainDeta_, x);
      u.x[] = c*eta/(1.0 + eta)*f[];
      u.y[] = -(y + 1.0)*c*deta/sq(1.0 + eta)*f[];
      f[] = min(1., f[] + beach[]);
    }
    n++;
  } while (adapt_wavelet ({f, u, beach}, (double[]){2e-4, 2e-2, 2e-2, 8e-3},
			  LEVEL, max(5, LEVEL - 5)).nf && n < 20);
}

event adapt (i++) {
  adapt_wavelet ({f, u, beach}, (double[]){1e-8, 2e-3, 2e-3, 1e-2},
		 LEVEL, max(5, LEVEL - 5));
}

/* Optionally keep the finest two levels only inside a window around the break
   (XWIN0 < x < XWIN1), so a restart at a finer level pays for the overturn only. */
#ifdef XWIN0
event window (i++) {
  unrefine ((x < XWIN0 || x > XWIN1) && level > LEVEL - 2);
}
#endif

event bedout (i = 1) {
  FILE * fp = fopen ("bed.dat", "w");
  output_facets (beach, fp);
  fclose (fp);
}

event logfile (i += 10) {
  static FILE * fp = fopen ("timing.log", "a");
  fprintf (fp, "# mgp.i=%d mgu.i=%d ", mgp.i, mgu.i);
  long nc = 0;
  foreach (reduction(+:nc)) nc++;
  fprintf (fp, "%d %g %g %ld %.2f\n", i, t, dt, nc, wallclock() - wall0);
  fflush (fp);
}

event out_coarse (t = 0; t <= TMAX; t += 1.0) {
  if (t >= TOUT0) return 0;
  char name[80];
  sprintf (name, "facets/f%07.3f.dat", t);
  FILE * fp = fopen (name, "w");
  output_facets (f, fp);
  fclose (fp);
}

event out_fine (t = TOUT0; t <= TMAX; t += DTOUT) {
  char name[80];
  sprintf (name, "facets/f%07.3f.dat", t);
  FILE * fp = fopen (name, "w");
  output_facets (f, fp);
  fclose (fp);
}

/* Checkpoint for resuming after a container restart. */
static double last_dump = 0.;
event snapshot (i++) {
  if (i == 0 || wallclock() - last_dump < 600.) return 0;
  dump (file = "restart.tmp");
  rename ("restart.tmp", "restart");
  last_dump = wallclock();
}

event end (t = TMAX) {
  dump (file = "final");   /* the state a finer restart continues from */
  FILE * fp = fopen ("done", "w");
  fprintf (fp, "i=%d t=%g wall=%.1f s\n", i, t, wallclock() - wall0);
  fclose (fp);
}
