import type { AudioEngine } from '../audio/AudioEngine';
import { SOUND_IDS, synthesize, type SoundId } from '../audio/synth';
import { el } from './dom';

/**
 * The sound check (S1, dev tools): every sound with its synthesised version and
 * its candidate recordings on buttons, a gain per sound, and the four bus levels.
 * Choices are made in `public/assets/audio/sounds.json`: each row shows the line
 * to paste there. Text here is dev-only, so it stays out of strings.ts.
 */
export function createSoundCheck(engine: () => AudioEngine | undefined): HTMLElement {
  const note = el('p', { class: 'sound-check-note', text: 'Click anywhere first: browsers start sound only after a click or key.' });
  const buses = (['master', 'sea', 'board', 'ui'] as const).map((bus) => {
    const input = el('input', { attrs: { type: 'range', min: '0', max: '1', step: '0.05', value: '1' } });
    const output = el('output', { text: '100 %' });
    input.addEventListener('input', () => {
      output.textContent = `${Math.round(Number(input.value) * 100)} %`;
      engine()?.setBusLevel(bus, Number(input.value));
    });
    return el('label', { class: 'slider-row' }, el('span', {}, `${bus} bus `, output), input);
  });
  const rows = SOUND_IDS.map((id) => soundRow(id, engine));
  return el('aside', { class: 'sound-check', attrs: { 'aria-label': 'Sound check' } },
    el('h2', { text: 'Sound check' }), note, ...buses, ...rows);
}

function soundRow(id: SoundId, engine: () => AudioEngine | undefined): HTMLElement {
  const bank = () => engine()?.soundBank;
  const entry = () => bank()?.manifest.sounds[id];
  const gain = el('input', { attrs: { type: 'range', min: '0', max: '2', step: '0.05', value: String(entry()?.gain ?? 1) } });
  const json = el('code');
  let chosen = entry()?.chosen ?? 0;
  const refresh = () => {
    json.textContent = `"${id}": { "chosen": ${chosen}, "gain": ${Number(gain.value)} }`;
  };
  gain.addEventListener('input', refresh);
  // A candidate plays at the sound's gain times its own level; a pooled candidate plays its next recording on each press.
  const play = (label: string, buffer: () => Promise<AudioBuffer | undefined>, index?: number, level: () => number = () => 1) => el('button', {
    class: 'button button-quiet', attrs: { type: 'button' }, text: label,
    on: {
      click: async () => {
        const audio = engine();
        const sound = await buffer();
        if (audio && sound) audio.audition(sound, Number(gain.value) * level());
        if (index !== undefined) {
          chosen = index;
          refresh();
        }
      },
    },
  });
  const candidates = entry()?.candidates ?? [];
  refresh();
  return el('div', { class: 'sound-check-row' },
    el('strong', { text: `${id}${bank()?.recorded(id) ? ' · recorded' : ' · synthesised'}` }),
    el('div', { class: 'panel-actions' },
      play('synth', async () => {
        const audio = engine();
        if (!audio) return undefined;
        // The synthesised version, even when a recording has replaced it in play.
        const samples = synthesize(id, audio.context.sampleRate);
        const buffer = audio.context.createBuffer(1, samples.length, audio.context.sampleRate);
        buffer.copyToChannel(samples, 0);
        return buffer;
      }),
      ...candidates.map((candidate, index) => play(
        candidate.variants?.length ? `${candidate.author} (×${1 + candidate.variants.length})` : candidate.author,
        async () => bank()?.candidate(id, index), index, () => bank()?.candidateLevel(id, index) ?? 1))),
    el('label', { class: 'slider-row' }, el('span', { text: 'gain' }), gain),
    json);
}
