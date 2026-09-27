import type { Action } from '../game/Bindings';
import type { LessonFlow } from '../game/school/lessonFlow';
import { LESSONS, type Lesson, type LessonId } from '../game/school/lessons';
import type { SchoolProgress } from '../game/school/schoolProgress';
import { t, type StringKey } from './strings';

/** The key, button or stick an action is on, for the device the player uses now. */
export type ActionLabel = (action: Action) => string;

const text = (id: LessonId, part: 'title' | 'blurb' | 'explain' | 'tip' | 'prompt', vars?: Record<string, string>) =>
  t(`lesson.${id}.${part}` as StringKey, vars);

/** Controls that read as one pair ("← →", "W S"). */
const PAIRS: readonly (readonly [Action, Action])[] = [['steerLeft', 'steerRight'], ['trimForward', 'trimBack']];

/** A lesson's controls in the player's keys: pairs side by side, the rest apart, nothing twice (a pad's stick covers both ways). */
export function lessonKeys(lesson: Lesson, label: ActionLabel): string {
  const groups: string[] = [];
  const { actions } = lesson;
  for (let i = 0; i < actions.length; i += 1) {
    const pair = PAIRS.find(([first, second]) => actions[i] === first && actions[i + 1] === second);
    if (pair) {
      const [a, b] = [label(pair[0]), label(pair[1])];
      groups.push(a === b ? a : `${a} ${b}`);
      i += 1;
    } else {
      groups.push(label(actions[i]));
    }
  }
  return [...new Set(groups)].join(' · ');
}

/** The School screen's list: each lesson's number, title and blurb, and whether it is passed. */
export function schoolListModel(progress: Pick<SchoolProgress, 'passed' | 'count'>, lessons: readonly Lesson[]) {
  return {
    rows: lessons.map((lesson, index) => ({
      id: lesson.id, number: index + 1, title: text(lesson.id, 'title'), blurb: text(lesson.id, 'blurb'), passed: progress.passed(lesson.id),
    })),
    progress: t('school.progress', { done: progress.count, total: lessons.length }),
  };
}

/** A lesson's explanation card: its number, title, explanation, diagram and the player's keys. */
export function lessonCardModel(lesson: Lesson, label: ActionLabel) {
  return {
    number: LESSONS.indexOf(lesson) + 1,
    title: text(lesson.id, 'title'),
    explain: text(lesson.id, 'explain'),
    diagram: lesson.id,
    keys: lessonKeys(lesson, label),
  };
}

/**
 * The HUD's two lines in the school: the prompt (undefined leaves the ride its
 * own, as Free Practice does) and the line under it: the goal's count during an
 * attempt, and after a miss why it ended, what to try, and that the wave comes
 * round again.
 */
export function lessonHud(flow: Pick<LessonFlow, 'lesson' | 'state' | 'goal' | 'cause'>, label: ActionLabel, retryKey: string): { prompt?: string; coach: string } {
  const { lesson } = flow;
  const again = t('school.againSoon', { retry: retryKey });
  if (flow.state === 'missed') {
    const cause = flow.cause ? t(flow.cause) : '';
    return { prompt: lesson ? t('school.missed', { cause, tip: text(lesson.id, 'tip') }) : cause, coach: again };
  }
  if (!lesson) return { prompt: undefined, coach: t('school.freeRide', { retry: retryKey }) };
  if (flow.state !== 'attempt') return { prompt: '', coach: '' };
  const { count } = flow.goal;
  const coach = count ? t(count.seconds ? 'school.countSeconds' : 'school.count', { done: count.done, of: count.of }) : '';
  return { prompt: text(lesson.id, 'prompt', { keys: lessonKeys(lesson, label) }), coach };
}
