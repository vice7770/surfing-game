import type { LessonId } from '../game/school/lessons';
import type { LessonStart } from '../game/school/lessonWave';
import { el, icon } from './dom';
import { ICONS } from './icons';
import type { schoolListModel } from './schoolModel';
import { t } from './strings';

export interface SchoolHandlers {
  lesson(id: LessonId): void;
  freePractice(start: LessonStart): void;
  back(): void;
}

/**
 * The Surf School's list (spec L2): the nine lessons in order, each with its
 * number, title, blurb and a check once passed, all open; then Free Practice with
 * its two starts. A lesson wave that would not load says so at the top.
 */
export function createSchoolScreen(model: ReturnType<typeof schoolListModel>, handlers: SchoolHandlers, error?: string): HTMLElement {
  const rows = model.rows.map((row, index) => el('button', {
    class: row.passed ? 'lesson-row is-passed' : 'lesson-row',
    attrs: { type: 'button', ...(row.passed ? { 'aria-label': `${row.title}, ${t('school.passed')}` } : {}) },
    dataset: index === 0 ? { nav: '', navDefault: '' } : { nav: '' },
    on: { click: () => handlers.lesson(row.id) },
  },
  el('span', { class: 'lesson-number', text: String(row.number) }),
  el('span', { class: 'lesson-text' }, el('strong', { text: row.title }), el('small', { text: row.blurb })),
  el('span', { class: 'lesson-check', text: row.passed ? '✓' : '', attrs: { 'aria-hidden': 'true' } })));
  const start = (which: LessonStart, label: Parameters<typeof t>[0]) => el('button', {
    class: 'button-secondary', attrs: { type: 'button' }, dataset: { nav: '' }, text: t(label), on: { click: () => handlers.freePractice(which) },
  });
  return el('section', { class: 'screen screen-panel', attrs: { 'aria-label': t('school.title') } },
    el('div', { class: 'panel panel-school' },
      el('header', { class: 'panel-header' },
        el('button', { class: 'icon-back', attrs: { type: 'button', 'aria-label': t('surf.back') }, dataset: { nav: '' }, on: { click: handlers.back } }, icon(ICONS.back)),
        el('h2', { text: t('school.title') })),
      el('p', { class: 'panel-lead', text: t('school.lead') }),
      error ? el('p', { class: 'online-message', attrs: { role: 'alert' }, text: error }) : null,
      el('p', { class: 'panel-subhead', text: model.progress }),
      el('div', { class: 'lesson-rows' }, ...rows),
      el('div', { class: 'free-practice' },
        el('div', { class: 'lesson-text' }, el('strong', { text: t('school.freePractice') }), el('small', { text: t('school.freePractice.blurb') })),
        el('div', { class: 'free-practice-starts' }, start('pocket', 'school.start.pocket'), start('waiting', 'school.start.waiting')))));
}
