/**
   Breakline round 6: a 2D two-phase solitary wave shoaling and overturning on a
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

static double sech_ (double q) { return 1.0/cosh(q); }
double waveGN (double x, double y) {
  double k = sqrt(3.*A0)/(2.*sqrt(1. + A0));
  return A0*sq(sech_(k*x)) - y;
}
double detax (double x) {
  double tmp1 = -sqrt(3.0)*A0*sqrt(A0)/sqrt(1.0 + A0);
  double tmp2 = sqrt(3.0*A0)/(2.0*sqrt(1.0 + A0));
  return tmp1*sq(sech_(tmp2*x))*tanh(tmp2*x);
}

event init (i = 0) {
  if (restore (file = "restart")) {
    fprintf (stderr, "restored at t=%g i=%d\n", t, i);
    return 0;
  }
  double c = sqrt(1.0 + A0);
  int n = 0;
  do {
    fraction (f, waveGN(x - XW, y));
    fraction (beach, bedProfile(x) - y);
    foreach() {
      double eta = waveGN(x - XW, y) + y;
      double deta = detax(x - XW);
      u.x[] = c*eta/(1.0 + eta)*f[];
      u.y[] = -(y + 1.0)*c*deta/(eta + 1.0)*(1.0 - eta/(1.0 + eta))*f[];
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
  FILE * fp = fopen ("done", "w");
  fprintf (fp, "i=%d t=%g wall=%.1f s\n", i, t, wallclock() - wall0);
  fclose (fp);
}
