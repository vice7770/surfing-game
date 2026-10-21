import { PerspectiveCamera, ShaderLib, type Material, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import { CausticMap } from './CausticMap';
import { EdgeBand } from './EdgeBand';
import { FarFieldOcean } from './FarFieldOcean';
import { LipSheetMesh } from './LipSheetMesh';
import { SpillingCurlMesh } from './SpillingCurlMesh';
import { RollerFrontMesh } from './RollerFrontMesh';
import { WaterSurface, type SurfaceSource } from './WaterSurface';
import { SweptBarrelMesh } from './barrel/SweptBarrelMesh';
import { TUBE_CAPACITY, TUBE_STRIDE } from '../wave/tubeTable';
import { ROLLER_SLOTS, ROLLER_STRIDE } from '../wave/SpillingRoller';
import type { WaterLook } from './water/waterLook';
import { glitterMode, setGlitter } from './water/glitter';

/**
 * The texture units each water program takes (the playtest of 2026-10-17: the Canyon's Rich water asked for 17 of
 * the M1's 16, and its program would not run). WebGL counts a program's active samplers, in both stages together;
 * three gives each its own unit. Without a context here, the samplers are counted on the composed GLSL: declared,
 * and used from `main` through the functions it reaches (a sampler only an uncalled function reads is optimized away).
 *
 * What this cannot see is three's own, in the chunks the materials leave as `#include`: a physical material
 * lit by the scene's environment and its shadow-casting sun samples `envMap`, `dfgLUT` and one
 * `directionalShadowMap`. Those are counted by rule (THREE_PHYSICAL), and kept out of the GLSL count.
 */
const UNITS = 16;
const THREE_PHYSICAL = ['envMap', 'dfgLUT', 'directionalShadowMap'];

const SAMPLER = /\buniform\s+(?:(?:lowp|mediump|highp)\s+)?[iu]?sampler(?:2D|2DArray|3D|Cube|2DShadow)\s+(\w+)\s*(?:\[[^\]]*\])?\s*;/g;
const FUNCTION = /\b(?:void|float|int|uint|bool|[iu]?vec[234]|mat[234])\s+(\w+)\s*\(([^()]*)\)\s*\{/g;

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/** The body of the brace block opening at `open`. */
function block(source: string, open: number): string {
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return source.slice(open);
}

/** The samplers one stage declares and reaches from `main`. */
function activeSamplers(stage: string): Set<string> {
  const source = stripComments(stage);
  const samplers = new Set([...source.matchAll(SAMPLER)].map((match) => match[1]));
  const bodies = new Map<string, string[]>();
  for (const match of source.matchAll(FUNCTION)) {
    const body = block(source, match.index! + match[0].length - 1);
    bodies.set(match[1], [...(bodies.get(match[1]) ?? []), body]);
  }
  const macros = new Map<string, string>();
  for (const match of source.matchAll(/^\s*#define\s+(\w+)(?:\([^)]*\))?[ \t]+([^\n]*)$/gm)) macros.set(match[1], match[2]);
  const reached = new Set<string>(['main']);
  const queue = [...(bodies.get('main') ?? [])];
  const used = new Set<string>();
  while (queue.length > 0) {
    const text = queue.pop()!;
    for (const [word] of text.matchAll(/\b[A-Za-z_]\w*\b/g)) {
      if (samplers.has(word)) used.add(word);
      if (reached.has(word)) continue;
      if (bodies.has(word)) {
        reached.add(word);
        queue.push(...bodies.get(word)!);
      } else if (macros.has(word)) {
        reached.add(word);
        queue.push(macros.get(word)!);
      }
    }
  }
  return used;
}

/**
 * The chop's and the glitter's names a program may only use where it declares them (the merged playtest build of
 * 2026-10-17 drew a curl sheet whose Rich program took the far normal chunk without its pars, and did not compile).
 */
const DECLARED = [
  ['waterChopStats', /\bvoid\s+waterChopStats\s*\(/],
  ['waterGlitterScreen', /\bvec3\s+waterGlitterScreen\s*\(/],
  ['waterGlitterCov', /\bvec3\s+waterGlitterCov\s*=/],
  ['waterGlitterCover', /\bfloat\s+waterGlitterCover\s*=/],
  ['waterGlitterOn', /\bfloat\s+waterGlitterOn\s*=/],
  ['waterGlitterSlope', /\bvec2\s+waterGlitterSlope\s*=/],
  ['waterRippleCov', /\bvec3\s+waterRippleCov\s*=/],
  ['waterGlitterSun', /\bfloat\s+waterGlitterSun\s*=/],
  ['waterGlitterRipple', /\bvec2\s+waterGlitterRipple\s*=/],
  ['waterGlitterLite', /\bfloat\s+waterGlitterLite\s*=/],
  ['waterChopMoments', /\buniform\s+highp\s+sampler2DArray\s+waterChopMoments\s*;/],
] as const;

/** The names a fragment uses without declaring them. */
function undeclared(fragment: string): string[] {
  const source = stripComments(fragment);
  return DECLARED.filter(([name, declaration]) => new RegExp(`\\b${name}\\b`).test(source) && !declaration.test(source)).map(([name]) => name);
}

/** A material's shaders after its `onBeforeCompile`, run on three's physical sources. */
function compiled(material: Material): { vertex: string; fragment: string } {
  const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader };
  material.onBeforeCompile(shader as unknown as WebGLProgramParametersWithUniforms, undefined as never);
  return { vertex: shader.vertexShader, fragment: shader.fragmentShader };
}

/** The units a program takes: its GLSL's active samplers (both stages), and three's own by rule when `physical`. */
function units({ vertex, fragment }: { vertex: string; fragment: string }, physical: boolean): { count: number; samplers: string[] } {
  const ours = new Set([...activeSamplers(vertex), ...activeSamplers(fragment)].filter((name) => !THREE_PHYSICAL.includes(name)));
  const samplers = [...ours].sort();
  return { count: samplers.length + (physical ? THREE_PHYSICAL.length : 0), samplers };
}

const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 8, nz: 8 };
const plain: SurfaceSource = { grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} };
const cubic: SurfaceSource = { ...plain, cubic: true, writeAeration: () => {}, writeFlow: () => {} };
const tubed: SurfaceSource = { ...cubic, tubeColumnWidth: 1, writeTubes: (into) => (into.fill(0, 0, TUBE_CAPACITY * TUBE_STRIDE), 0) };
const roller: SurfaceSource = {
  ...tubed, rollerColumns: 4, rollerColumn0: 0.5, rollerColumnWidth: 1,
  writeRoller: (into) => { into.fill(0, 0, ROLLER_SLOTS * 4 * ROLLER_STRIDE); return 4; },
};
/** The Canyon's: the roller, and a rock floor's cover of its bed (`rockBed.ts`), read from the bed's own texture. */
const rocky: SurfaceSource = { ...roller, writeBedCover: (into) => into.fill(0) };

/** Every water program a spot can turn on: each source and option, in both looks, and the edge band made of it. */
function waterPrograms(): { name: string; program: { vertex: string; fragment: string } }[] {
  const out: { name: string; program: { vertex: string; fragment: string } }[] = [];
  const sources = { plain, cubic, tubed, roller, rocky } as const;
  for (const look of ['classic', 'rich'] as WaterLook[]) {
    for (const [sourceName, source] of Object.entries(sources)) {
      for (const barrel of [false, true]) {
        // The roller runs only where no swept crash does (SurfZoneSimulation): a spot never has it and the curl's seam.
        if (barrel && (source === roller || source === rocky)) continue;
        for (const vertexNormals of [false, true]) {
          if (vertexNormals && (look === 'classic' || barrel)) continue;
          const water = new WaterSurface(source);
          water.setLook(look);
          water.setBarrelEnabled(barrel);
          if (vertexNormals) water.setVertexNormals(true);
          const far = new FarFieldOcean();
          far.setLook(look);
          const band = new EdgeBand(water, far);
          const name = `${look} ${sourceName}${barrel ? ' barrel' : ''}${vertexNormals ? ' vertex-normals' : ''}`;
          out.push({ name: `water ${name}`, program: compiled(water.mesh.material) });
          out.push({ name: `edge band ${name}`, program: compiled(band.mesh.material) });
        }
      }
    }
  }
  return out;
}

describe('the water programs\' texture units (≤ 16, the M1\'s)', () => {
  it('counts a program\'s samplers as WebGL does: only those main reaches', () => {
    const program = {
      vertex: 'uniform sampler2D a;\nuniform sampler2D unused;\nvec4 f() { return texture( a, vec2( 0.0 ) ); }\nvoid main() { gl_Position = f(); }',
      fragment: 'uniform highp sampler2DArray b;\nuniform sampler2D a;\nuniform sampler2D directionalShadowMap[ 1 ];\nvec4 g() { return texture( unusedToo, vec2( 0.0 ) ); }\n#define READ texture( b, vec3( 0.0 ) )\nvoid main() { gl_FragColor = READ + texture( directionalShadowMap[ 0 ], vec2( 0.0 ) ); }',
    };
    expect(units(program, false).samplers).toEqual(['a', 'b']);
    expect(units(program, true).count).toBe(5);
    expect(undeclared('void main() { waterGlitterCov += vec3( 1.0 ); }')).toEqual(['waterGlitterCov']);
    expect(undeclared('vec3 waterGlitterCov = vec3( 0.0 );\nvoid main() { waterGlitterCov += vec3( 1.0 ); }')).toEqual([]);
  });

  it('keeps every tank and edge-band program, in either look, with every option a spot can turn on, within the units', () => {
    const programs = waterPrograms();
    expect(programs.map(({ name, program }) => [name, undeclared(program.fragment)]).filter(([, names]) => names.length > 0)).toEqual([]);
    const counts = Object.fromEntries(programs.map(({ name, program }) => [name, units(program, true)]));
    const over = Object.entries(counts).filter(([, { count }]) => count > UNITS).map(([name, { count, samplers }]) => `${name}: ${count} (${samplers.join(', ')})`);
    expect(over).toEqual([]);
    // The Canyon's (the roller) and Padang Padang's (the swept barrel) Rich programs, the fullest.
    expect(counts['water rich roller'].count).toBeLessThanOrEqual(15);
    expect(counts['edge band rich roller'].count).toBeLessThanOrEqual(UNITS);
    // The rock's cover adds no unit: it rides in the bed's texture.
    expect(counts['water rich rocky'].count).toBe(counts['water rich roller'].count);
    expect(counts['edge band rich rocky'].count).toBe(counts['edge band rich roller'].count);
  });

  it('keeps the far ocean, the tube, the spilling curl, the roller front, the lip and the caustics within the units', () => {
    const programs: [string, { vertex: string; fragment: string }, boolean][] = [];
    for (const look of ['classic', 'rich'] as WaterLook[]) {
      const far = new FarFieldOcean();
      far.setLook(look);
      programs.push([`far ocean ${look}`, compiled(far.mesh.material), true]);
      const water = new WaterSurface(roller);
      water.setLook(look);
      const band = new EdgeBand(water, far);
      far.attachRim(band.rimUniforms);
      programs.push([`far ocean ${look} rim`, compiled(far.mesh.material), true]);
      const tube = new SweptBarrelMesh(water.materialUniforms);
      tube.setLook(look);
      programs.push([`swept barrel ${look}`, compiled(tube.mesh.material), true]);
      const curl = new SpillingCurlMesh(water.materialUniforms);
      curl.setLook(look);
      programs.push([`spilling curl ${look}`, compiled(curl.mesh.material), true]);
      // Over a rock floor (the Canyon's): its body reads the cover from the bed's texture it already reads.
      const rockCurl = new SpillingCurlMesh(new WaterSurface(rocky).materialUniforms);
      rockCurl.setLook(look);
      rockCurl.rockBed = () => true;
      rockCurl.mesh.onBeforeRender(
        { getRenderTarget: () => ({ height: 720 }) } as never, undefined as never, new PerspectiveCamera(), rockCurl.mesh.geometry, rockCurl.mesh.material, null as never,
      );
      const rockProgram = compiled(rockCurl.mesh.material);
      expect(rockProgram.vertex).toContain('vWaterRock');
      expect(units(rockProgram, true).count).toBe(units(compiled(curl.mesh.material), true).count);
      programs.push([`spilling curl ${look} rock`, rockProgram, true]);
    }
    // The roller front (Rich only, its own program): the water's heights in its vertices, the churn in its fragments.
    const front = new RollerFrontMesh(new WaterSurface(roller).materialUniforms);
    const frontProgram = compiled(front.mesh.material);
    expect(units(frontProgram, true).samplers).toEqual(['rfLook', 'waterChurnMap', 'waterRoller', 'waterSurface']);
    programs.push(['roller front', frontProgram, true]);
    const lip = new LipSheetMesh();
    programs.push(['lip rich', compiled(lip.richMaterial), true]);
    const caustics = new CausticMap(new WaterSurface(cubic).causticSource);
    const causticMaterial = (caustics as unknown as { mesh: { material: { vertexShader: string; fragmentShader: string } } }).mesh.material;
    programs.push(['caustics', { vertex: causticMaterial.vertexShader, fragment: causticMaterial.fragmentShader }, false]);
    expect(programs.map(([name, program]) => [name, undeclared(program.fragment)]).filter(([, names]) => names.length > 0)).toEqual([]);
    const over = programs.map(([name, program, physical]) => [name, units(program, physical)] as const)
      .filter(([, { count }]) => count > UNITS).map(([name, { count, samplers }]) => `${name}: ${count} (${samplers.join(', ')})`);
    expect(over).toEqual([]);
  });

  it('keeps Medium\'s lite sun road (and the glitter off) within the units, its names declared', () => {
    const was = { ...glitterMode };
    try {
      for (const mode of [{ on: false, lite: true }, { on: false, lite: false }]) {
        setGlitter(mode);
        // A plain source draws Classic whatever the look (Rich takes the cubic surface): every program, so Classic's never lite.
        const programs = waterPrograms();
        const far = new FarFieldOcean();
        far.setLook('rich');
        programs.push({ name: 'far ocean rich', program: compiled(far.mesh.material) });
        const label = mode.lite ? 'lite' : 'off';
        expect(programs.map(({ name, program }) => [`${label} ${name}`, undeclared(program.fragment)]).filter(([, names]) => names.length > 0)).toEqual([]);
        const over = programs.map(({ name, program }) => [`${label} ${name}`, units(program, true)] as const)
          .filter(([, { count }]) => count > UNITS).map(([name, { count }]) => `${name}: ${count}`);
        expect(over).toEqual([]);
        const rich = (name: string) => name.includes('rich') && !name.includes('plain');
        expect(programs.filter(({ name, program }) => program.fragment.includes('#define WATER_SUN_LITE') !== (mode.lite && rich(name)))
          .map(({ name }) => name)).toEqual([]);
      }
    } finally {
      setGlitter(was);
    }
  });
});
