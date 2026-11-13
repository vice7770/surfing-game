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
   Optional reef top (2026-11-04, the Wave Pool's bigger-tube batch): with
   REEFTOP defined, the flat at HS ends REEFTOP (h0) past the last slope, and
   the bed falls from there at SBACK (default 1/20) back to the deep bed's depth
   (y = -1), then runs flat to the closed right wall. A reef crest with a
   lagoon behind it, instead of a flat that runs to the wall and over-drains
   the wave studied. Without REEFTOP the bed is exactly as before.
   Optional velocity output (2026-11-11, the Wave Pool Barrel's one interior
   flow): with VELOUT defined, every fine frame also writes vel/v<t>.dat, the
   water's velocity under the surface (see output_surface_velocity below).
   Without VELOUT the run and its files are exactly as before.
   Optional column output (2026-11-13, C2's library: docs/research/wave-strategy-alternatives/
   c2-step1.md): with QOUT defined, every fine frame also writes q/q<t>.dat, the water column per
   x bin over the whole domain (see output_columns below). Without QOUT the run and its files are
   exactly as before.
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
#if defined(REEFTOP) && !defined(SBACK)
#define SBACK (1./20.)
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
#ifdef REEFTOP
  double x3 = x2 + REEFTOP;                 // end of the reef top
  if (x < x3) return -HS;
  return max(-1.0, -HS - SBACK*(x - x3));   // the back slope, then the deep bed to the wall
#else
  return -HS;
#endif
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

#ifdef VELOUT
/** The water's velocity under the surface, for the game's wall water. One row
    per interfacial cell of open water (inside XWIN0..XWIN1 when the run has a
    window):
      x y nx ny Delta   then, per sample depth,   u v w
    (x, y) the cell's centre, (nx, ny) the surface's unit normal out of the
    water, Delta the cell's size; (u, v) the velocity a depth d into the water
    along the normal, and w the water's fraction there (f less the bed's; under
    0.5 the sample is in air, spray or the bed and is to be dropped). The first
    sample is at 1.5 Delta, just under the surface, clear of the mixed cells
    whose velocity is part air's; the others at VELDEPTHS (h0). Units as the
    run's: h0 = 1, g = 1. */
#ifndef VELDEPTHS
#define VELDEPTHS 0.01, 0.02, 0.05, 0.1
#endif
#ifdef XWIN0
#define VELX0 XWIN0
#define VELX1 XWIN1
#else
#define VELX0 (-HUGE)
#define VELX1 HUGE
#endif
static void output_surface_velocity (FILE * fp) {
  static const double depths[] = {VELDEPTHS};
  int nd = sizeof(depths)/sizeof(depths[0]) + 1;
  int cap = 1 << 14, n = 0;
  double * rows = malloc (cap*5*sizeof(double));
  foreach (serial)
    if (f[] > 1e-6 && f[] < 1. - 1e-6 && beach[] < 0.5 && x > VELX0 && x < VELX1) {
      coord m = mycs (point, f);   /* from the water towards the air */
      double len = sqrt (sq(m.x) + sq(m.y));
      if (len > 0.) {
	if (n == cap) { cap *= 2; rows = realloc (rows, cap*5*sizeof(double)); }
	double * c = rows + 5*n++;
	c[0] = x; c[1] = y; c[2] = m.x/len; c[3] = m.y/len; c[4] = Delta;
      }
    }
  coord * at = malloc (max(1, n*nd)*sizeof(coord));
  double * val = malloc (max(1, n*nd)*4*sizeof(double));
  for (int k = 0; k < n; k++) {
    double * c = rows + 5*k;
    for (int j = 0; j < nd; j++) {
      double d = j == 0 ? 1.5*c[4] : depths[j - 1];
      at[k*nd + j] = (coord){c[0] - d*c[2], c[1] - d*c[3], 0.};
    }
  }
  interpolate_array ({u.x, u.y, f, beach}, at, n*nd, val, true);
  for (int k = 0; k < n; k++) {
    double * c = rows + 5*k;
    fprintf (fp, "%.6g %.6g %.4f %.4f %.4g", c[0], c[1], c[2], c[3], c[4]);
    for (int j = 0; j < nd; j++) {
      double * v = val + 4*(k*nd + j);
      if (v[0] == nodata) fprintf (fp, " 0 0 0");   /* outside the domain */
      else fprintf (fp, " %.5g %.5g %.3f", v[0], v[1], clamp (v[2] - v[3], 0., 1.));
    }
    fputc ('\n', fp);
  }
  free (rows); free (at); free (val);
}
#endif

#ifdef QOUT
/** The water column per x bin, for C2's hand-back (the sea relaxed to the case's column volume and flux) and its bore
    (one height per point plus an air share). One row per bin of width QDX (h0; default the window's coarser fine level,
    L0/2^(LEVEL-2)), over the whole domain, so the volume's sum is the run's water:
      x  bed  h  q  top  air
    x the bin's centre; bed the bed's elevation there (bedProfile); h the water's volume per unit width (h0), the
    integral over y of the water's fraction (f less the bed's); q the integral of u.x over the water (h0 sqrt(g h0)),
    f-weighted as h is; top the highest water in the bin (a cell's water stacked at its bottom: y - Delta/2 + w Delta,
    over cells with w > 0.5, then raised by a part-filled cell resting on it, within half a cell; else the bin's highest
    wet cell; -1 - yOffset_ where the bin holds no water); air the air's
    volume per unit width below the top (the tube's void, bubbles, the bore's froth; the bed is water-filled, so it adds
    none), each finest column (L0/2^LEVEL) below its own top, so a sloping surface inside a bin adds none. The air share under the top surface is air / (air + h), as the analysis reads it (c2_library.py). Each
    leaf cell is shared out to the bins it overlaps by length, so a coarse cell outside the window spans several bins
    and a fine one adds to one. Units as the run's: h0 = 1, g = 1. */
#ifndef QDX
#define QDX (L0/(double)(1 << (LEVEL - 2)))
#endif
static void output_columns (FILE * fp) {
  int nb = (int) ceil (L0/QDX - 1e-9);
  double bw = L0/nb;
  /* the tops on the finest columns (L0/2^LEVEL), so the air under a sloping surface is not counted up to a bin's highest
     point; then summed into the bins */
  int nf = 1 << LEVEL;
  double fw = L0/nf;
  double * ftop = malloc (nf*sizeof(double)), * fwet = malloc (nf*sizeof(double));
  double * ch = calloc (nb, sizeof(double)), * cq = calloc (nb, sizeof(double)), * cair = calloc (nb, sizeof(double));
  for (int k = 0; k < nf; k++) ftop[k] = fwet[k] = -HUGE;
  /* first the tops: the highest water (w > 0.5) in each fine column */
  foreach (serial) {
    double w = f[] - beach[];
    if (w > 1e-6) {
      double surf = y - Delta/2. + min (w, 1.)*Delta;
      int k0 = max (0, (int) floor ((x - Delta/2. - X0)/fw + 1e-9));
      int k1 = min (nf - 1, (int) floor ((x + Delta/2. - X0)/fw - 1e-9));
      for (int k = k0; k <= k1; k++) {
        if (w > 0.5 && surf > ftop[k]) ftop[k] = surf;
        if (surf > fwet[k]) fwet[k] = surf;
      }
    }
  }
  for (int k = 0; k < nf; k++) if (ftop[k] == -HUGE) ftop[k] = fwet[k];
  /* a part-filled cell resting on the top (its bottom within half a cell of it) raises it to its own water's top */
  foreach (serial) {
    double w = f[] - beach[];
    if (w > 1e-6 && w <= 0.5) {
      double ylo = y - Delta/2., surf = ylo + w*Delta;
      int k0 = max (0, (int) floor ((x - Delta/2. - X0)/fw + 1e-9));
      int k1 = min (nf - 1, (int) floor ((x + Delta/2. - X0)/fw - 1e-9));
      for (int k = k0; k <= k1; k++)
        if (ftop[k] > -HUGE && fabs (ylo - ftop[k]) <= 0.5*Delta && surf > ftop[k]) ftop[k] = surf;
    }
  }
  /* then the sums: the water and its flux per bin; the air under each fine column's top */
  foreach (serial) {
    double w = f[] - beach[];
    double x0 = x - Delta/2., x1 = x + Delta/2., ylo = y - Delta/2.;
    int b0 = max (0, (int) floor ((x0 - X0)/bw + 1e-9));
    int b1 = min (nb - 1, (int) floor ((x1 - X0)/bw - 1e-9));
    for (int b = b0; b <= b1; b++) {
      double len = min (x1, X0 + (b + 1)*bw) - max (x0, X0 + b*bw);
      if (len > 0.) {
        ch[b] += w*Delta*len;
        cq[b] += w*u.x[]*Delta*len;
      }
    }
    int k0 = max (0, (int) floor ((x0 - X0)/fw + 1e-9));
    int k1 = min (nf - 1, (int) floor ((x1 - X0)/fw - 1e-9));
    for (int k = k0; k <= k1; k++) {
      double len = min (x1, X0 + (k + 1)*fw) - max (x0, X0 + k*fw);
      /* the cell's water (with the bed's part, which is water-filled: f = 1 there) stacked at its bottom, its air above
         it up to the top */
      if (len > 0. && ftop[k] > -HUGE && ylo < ftop[k]) {
        int b = min (nb - 1, (int) floor ((X0 + (k + 0.5)*fw - X0)/bw));
        cair[b] += max (0., min (ftop[k] - ylo, Delta) - clamp (f[], 0., 1.)*Delta)*len;
      }
    }
  }
  for (int b = 0; b < nb; b++) {
    double xc = X0 + (b + 0.5)*bw, top = -HUGE;
    for (int k = (int) floor (b*bw/fw + 1e-9); k < nf && X0 + (k + 0.5)*fw < X0 + (b + 1)*bw; k++)
      if (ftop[k] > top) top = ftop[k];
    fprintf (fp, "%.6g %.6g %.7g %.7g %.6g %.6g\n", xc, bedProfile (xc), ch[b]/bw, cq[b]/bw,
	     top > -HUGE ? top : -1. - yOffset_, cair[b]/bw);
  }
  free (ftop); free (fwet); free (ch); free (cq); free (cair);
}
#endif

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
#ifdef VELOUT
  sprintf (name, "vel/v%07.3f.dat", t);
  fp = fopen (name, "w");
  if (fp) { output_surface_velocity (fp); fclose (fp); }
#endif
#ifdef QOUT
  sprintf (name, "q/q%07.3f.dat", t);
  fp = fopen (name, "w");
  if (fp) { output_columns (fp); fclose (fp); }
#endif
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
