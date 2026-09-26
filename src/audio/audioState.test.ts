import { describe, expect, it } from 'vitest';
import { INITIAL_AUDIO_STATE, audible, audioState, shouldRun, type AudioEvent, type AudioState } from './audioState';

const run = (events: AudioEvent[], from: AudioState = INITIAL_AUDIO_STATE) => events.reduce(audioState, from);

describe('audioState', () => {
  it('stays silent until the first gesture, then runs', () => {
    expect(shouldRun(INITIAL_AUDIO_STATE)).toBe(false);
    const started = run([{ type: 'gesture' }]);
    expect(started.phase).toBe('running');
    expect(audible(started)).toBe(true);
    expect(run([{ type: 'gesture' }, { type: 'gesture' }])).toEqual(started);
  });

  it('suspends out of view when muting in the background, and resumes in view', () => {
    const hidden = run([{ type: 'gesture' }, { type: 'visibility', hidden: true }]);
    expect(hidden.phase).toBe('suspended');
    expect(shouldRun(hidden)).toBe(false);
    expect(run([{ type: 'visibility', hidden: false }], hidden).phase).toBe('running');
  });

  it('keeps playing out of view when background muting is off, and follows the setting when it changes while hidden', () => {
    const keepPlaying = run([{ type: 'muteInBackground', on: false }, { type: 'gesture' }, { type: 'visibility', hidden: true }]);
    expect(keepPlaying.phase).toBe('running');
    expect(run([{ type: 'muteInBackground', on: true }], keepPlaying).phase).toBe('suspended');
    const hidden = run([{ type: 'gesture' }, { type: 'visibility', hidden: true }]);
    expect(run([{ type: 'muteInBackground', on: false }], hidden).phase).toBe('running');
  });

  it('remembers mute through every phase, even before sound has started', () => {
    const mutedEarly = run([{ type: 'toggleMute' }]);
    expect(mutedEarly.muted).toBe(true);
    const started = run([{ type: 'gesture' }], mutedEarly);
    expect(shouldRun(started)).toBe(true);
    expect(audible(started)).toBe(false);
    const suspended = run([{ type: 'visibility', hidden: true }, { type: 'toggleMute' }], started);
    expect(suspended).toMatchObject({ phase: 'suspended', muted: false });
    expect(run([{ type: 'setMuted', muted: true }], suspended).muted).toBe(true);
  });

  it('does not start on a gesture made while hidden with background muting on', () => {
    const hidden = run([{ type: 'visibility', hidden: true }, { type: 'gesture' }]);
    expect(hidden.phase).toBe('suspended');
    expect(run([{ type: 'visibility', hidden: false }], hidden).phase).toBe('running');
  });
});
