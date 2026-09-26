import { Color, DirectionalLight, Group, Mesh, NeutralToneMapping, PerspectiveCamera, Quaternion, Scene, Vector3, WebGLRenderer, type Material } from 'three';
import { outfitFor, SUIT_COLORS, type SurferSettings } from '../../game/SurferChoice';
import { TIMES, type TimeOfDay } from '../../game/SurfConditions';
import { buildBoardShape } from '../../physics/boardShape';
import { createBoardMesh } from '../BoardMesh';
import { BOARD_DESIGNS } from '../board/boardDesigns';
import { PhotoSky, sunElevationFromSlider } from '../PhotoSky';
import { posturePoints } from '../rig/posturePoints';
import { createRiderVisualState } from '../rig/riderVisualState';
import { SurferView } from './SurferView';

/** The camera circles the surfer at this rate, rad/s (held still with reduced motion). */
const TURN_RATE = 0.15;
/** Where the camera circles: its distance and height, and the height it looks at, m. */
const ORBIT_RADIUS = 5.4;
const ORBIT_HEIGHT = 1.5;
const LOOK_HEIGHT = 0.8;

/**
 * The Surf screen's preview of the player's surfer (G7 Part B): standing on
 * their board, lit by the chosen time of day's photographed sky, the camera
 * slowly circling. It draws on its own small canvas and WebGL context, which
 * `dispose` releases.
 */
export class SurferPreview {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(30, 1, 0.1, 100);
  private readonly sun = new DirectionalLight('#ffffff', 2);
  private readonly view = new SurferView();
  private readonly sky: PhotoSky;
  private readonly boardShape = buildBoardShape();
  private readonly boardPosition = new Vector3(0, 0, 0);
  private readonly state = createRiderVisualState();
  private board?: Group;
  private boardDesign?: string;
  private body?: string;
  private angle = 0.7;
  private frame = 0;
  private last = 0;

  private constructor(private readonly canvas: HTMLCanvasElement, private readonly renderer: WebGLRenderer, private readonly reducedMotion: boolean) {
    renderer.outputColorSpace = 'srgb';
    renderer.toneMapping = NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
    this.sky = new PhotoSky(renderer);
    // The preview is a close-up: always the full body, and full-size textures.
    this.view.setDetail(Infinity, 2048);
    posturePoints('standing', 'regular', this.boardPosition, new Quaternion(), this.state);
    this.scene.add(this.view.group, this.sun, this.sun.target);
    this.tick = this.tick.bind(this);
    this.frame = requestAnimationFrame(this.tick);
  }

  /** A preview on `canvas`, or none where WebGL is unavailable. */
  static create(canvas: HTMLCanvasElement, options: { reducedMotion: boolean }): SurferPreview | undefined {
    try {
      return new SurferPreview(canvas, new WebGLRenderer({ canvas, alpha: true, antialias: true }), options.reducedMotion);
    } catch {
      return undefined;
    }
  }

  show(choice: SurferSettings, time: TimeOfDay): void {
    this.view.dress(outfitFor(choice), { accent: new Color(SUIT_COLORS[choice.color]) });
    if (choice.body !== this.body) {
      this.body = choice.body;
      void this.view.load(choice.body);
    }
    if (choice.board !== this.boardDesign) {
      this.boardDesign = choice.board;
      if (this.board) this.release(this.board);
      this.board = createBoardMesh(this.boardShape, BOARD_DESIGNS.find((design) => design.id === choice.board) ?? BOARD_DESIGNS[0]);
      this.board.position.copy(this.boardPosition);
      this.scene.add(this.board);
    }
    const { sunHeight, sunDirection } = TIMES[time];
    void this.sky.select(sunElevationFromSlider(sunHeight), sunDirection).then(() => {
      this.sky.applyTo(this.scene, []);
      this.sun.color.copy(this.sky.sunColor);
      this.sun.intensity = this.sky.sunIntensity;
      this.sun.position.copy(this.sky.sunDirection).multiplyScalar(10);
    });
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    if (this.board) this.release(this.board);
    this.sky.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private tick(now: number): void {
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
    this.last = now;
    if (!this.reducedMotion) this.angle += TURN_RATE * dt;
    const { clientWidth: width, clientHeight: height } = this.canvas;
    if (width > 0 && height > 0 && (this.canvas.width !== Math.round(width * this.renderer.getPixelRatio()) || this.camera.aspect !== width / height)) {
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
    this.camera.position.set(Math.sin(this.angle) * ORBIT_RADIUS, ORBIT_HEIGHT, Math.cos(this.angle) * ORBIT_RADIUS);
    this.camera.lookAt(0, LOOK_HEIGHT, 0);
    this.view.update(this.state, this.camera.position);
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.tick);
  }

  private release(group: Group): void {
    this.scene.remove(group);
    group.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.geometry.dispose();
      for (const material of ([] as Material[]).concat(object.material)) material.dispose();
    });
  }
}
