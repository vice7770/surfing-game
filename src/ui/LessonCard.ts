import type { LessonId } from '../game/school/lessons';
import { el } from './dom';
import { LESSON_DIAGRAMS } from './lessonDiagrams';
import type { lessonCardModel } from './schoolModel';
import { t, type StringKey } from './strings';

type CardModel = ReturnType<typeof lessonCardModel>;

function diagram(id: LessonId): Element {
  const template = document.createElement('template');
  template.innerHTML = LESSON_DIAGRAMS[id];
  return template.content.firstElementChild!;
}

/** The body every lesson card shares: number, title, diagram, explanation and the player's keys. */
function cardBody(model: CardModel): HTMLElement[] {
  return [
    el('p', { class: 'panel-subhead', text: t('school.lesson', { n: model.number }) }),
    el('h2', { class: 'lesson-title', text: model.title }),
    el('div', { class: 'lesson-diagram' }, diagram(model.diagram)),
    el('p', { class: 'lesson-explain', text: model.explain }),
    el('p', { class: 'lesson-keys' }, el('span', { text: t('school.keys') }), el('span', { class: 'keycap', text: model.keys })),
  ];
}

/**
 * A lesson's explanation card (spec L2), over the sea held still at the lesson's
 * moment: the explanation, a diagram and the keys, then Start (or Close when it
 * is only being read, from Free Practice's How to…).
 */
export function createLessonCard(model: CardModel, handlers: { go(): void; list?(): void }, go: StringKey = 'school.go'): HTMLElement {
  return el('section', { class: 'screen screen-panel screen-lesson-card', attrs: { 'aria-label': model.title } },
    el('div', { class: 'panel panel-narrow panel-lesson' },
      ...cardBody(model),
      el('div', { class: 'panel-footer' },
        handlers.list ? el('button', { class: 'button-secondary', attrs: { type: 'button' }, dataset: { nav: '' }, text: t('school.list'), on: { click: handlers.list } }) : null,
        el('button', { class: 'button-primary', attrs: { type: 'button' }, dataset: { nav: '', navDefault: '' }, text: t(go), on: { click: handlers.go } }))));
}

/** Passed (spec L2): the next lesson, the same one again, or the list; the sea waits behind it. */
export function createPassCard(title: string, handlers: { next?(): void; again(): void; list(): void }): HTMLElement {
  const button = (label: StringKey, action: () => void, primary = false) => el('button', {
    class: primary ? 'button-primary' : 'button-secondary', attrs: { type: 'button' }, dataset: primary ? { nav: '', navDefault: '' } : { nav: '' },
    text: t(label), on: { click: action },
  });
  return el('aside', { class: 'end-card lesson-pass', attrs: { role: 'status' } },
    el('div', { class: 'end-card-head' }, el('div', {}, el('h2', { text: t('school.passed') }), el('p', { class: 'end-card-reason', text: title }))),
    el('div', { class: 'end-card-actions' },
      handlers.next ? button('school.next', handlers.next, true) : null,
      button('school.again', handlers.again, !handlers.next),
      button('school.list', handlers.list)));
}

/** Free Practice's How to… (spec L2): every lesson's explanation, one at a time, read-only. */
export function createHowTo(models: readonly CardModel[], close: () => void): HTMLElement {
  const detail = el('div', { class: 'how-to-detail' });
  const show = (model: CardModel) => detail.replaceChildren(...cardBody(model));
  show(models[0]);
  return el('section', { class: 'screen screen-panel', attrs: { 'aria-label': t('school.howTo') } },
    el('div', { class: 'panel panel-how-to' },
      el('div', { class: 'how-to-list' }, ...models.map((model) => el('button', {
        class: 'button-secondary', attrs: { type: 'button' }, dataset: { nav: '' }, text: model.title, on: { click: () => show(model) },
      }))),
      detail,
      el('div', { class: 'panel-footer' },
        el('button', { class: 'button-primary', attrs: { type: 'button' }, dataset: { nav: '', navDefault: '' }, text: t('school.close'), on: { click: close } }))));
}
