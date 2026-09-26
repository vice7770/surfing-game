/**
 * When the game makes sound (S1). Browsers allow audio only after a click or
 * key: until then nothing runs (`idle`). After it, sound runs unless the page is
 * out of view with background muting on (`suspended`). Mute is a separate flag,
 * remembered through every phase.
 */
export type AudioPhase = 'idle' | 'running' | 'suspended';

export interface AudioState {
  phase: AudioPhase;
  muted: boolean;
  hidden: boolean;
  muteInBackground: boolean;
}

export type AudioEvent =
  | { type: 'gesture' }
  | { type: 'visibility'; hidden: boolean }
  | { type: 'muteInBackground'; on: boolean }
  | { type: 'toggleMute' }
  | { type: 'setMuted'; muted: boolean };

export const INITIAL_AUDIO_STATE: AudioState = { phase: 'idle', muted: false, hidden: false, muteInBackground: true };

/** Running or suspended, once started, from whether the page may play now. */
function started(state: AudioState): AudioPhase {
  return state.hidden && state.muteInBackground ? 'suspended' : 'running';
}

export function audioState(state: AudioState, event: AudioEvent): AudioState {
  switch (event.type) {
    case 'gesture':
      return state.phase === 'idle' ? { ...state, phase: started(state) } : state;
    case 'visibility': {
      const next = { ...state, hidden: event.hidden };
      return state.phase === 'idle' ? next : { ...next, phase: started(next) };
    }
    case 'muteInBackground': {
      const next = { ...state, muteInBackground: event.on };
      return state.phase === 'idle' ? next : { ...next, phase: started(next) };
    }
    case 'toggleMute':
      return { ...state, muted: !state.muted };
    case 'setMuted':
      return { ...state, muted: event.muted };
  }
}

/** Whether the audio context should be running. */
export const shouldRun = (state: AudioState): boolean => state.phase === 'running';

/** Whether sound comes out: running and not muted. */
export const audible = (state: AudioState): boolean => shouldRun(state) && !state.muted;
