import { LESSONS, type LessonId } from './lessons';

export const SCHOOL_KEY = 'breakline.school.v1';

const IDS = new Set<string>(LESSONS.map((lesson) => lesson.id));

/**
 * Which Surf School lessons the player has passed (spec L2), kept across visits.
 * Storage that fails (private mode, full) keeps them for the session only.
 */
export class SchoolProgress {
  private readonly done = new Set<LessonId>();

  constructor(private readonly storage?: Pick<Storage, 'getItem' | 'setItem'>) {
    try {
      const stored: unknown = JSON.parse(storage?.getItem(SCHOOL_KEY) ?? '[]');
      if (Array.isArray(stored)) for (const id of stored) if (typeof id === 'string' && IDS.has(id)) this.done.add(id as LessonId);
    } catch {
      // Nothing remembered; the school starts fresh.
    }
  }

  passed(id: LessonId): boolean {
    return this.done.has(id);
  }

  pass(id: LessonId): void {
    if (this.done.has(id)) return;
    this.done.add(id);
    try {
      this.storage?.setItem(SCHOOL_KEY, JSON.stringify([...this.done]));
    } catch {
      // Remembered for this session only.
    }
  }

  get count(): number {
    return this.done.size;
  }

  /** The first lesson is passed: the menu's "Start here" badge goes. */
  get started(): boolean {
    return this.done.has(LESSONS[0].id);
  }
}
