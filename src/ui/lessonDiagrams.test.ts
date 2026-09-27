import { describe, expect, it } from 'vitest';
import { LESSONS } from '../game/school/lessons';
import { EN, type StringKey } from './strings';
import { LESSON_DIAGRAMS } from './lessonDiagrams';

describe('lesson words and diagrams', () => {
  it('draws every lesson as an inline SVG in the text colour', () => {
    for (const lesson of LESSONS) {
      const svg = LESSON_DIAGRAMS[lesson.id];
      expect(svg.startsWith('<svg'), lesson.id).toBe(true);
      expect(svg).toContain('viewBox="0 0 120 80"');
      expect(svg).toContain('currentColor');
    }
  });

  it('gives every lesson a title, a blurb, an explanation, a tip and a prompt naming its keys', () => {
    for (const lesson of LESSONS) {
      for (const part of ['title', 'blurb', 'explain', 'tip', 'prompt']) {
        const key = `lesson.${lesson.id}.${part}` as StringKey;
        expect(EN[key], key).toBeTruthy();
      }
      expect(EN[`lesson.${lesson.id}.prompt` as StringKey]).toContain('{keys}');
    }
  });
});
