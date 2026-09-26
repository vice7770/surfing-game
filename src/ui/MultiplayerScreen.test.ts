import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM_SETTINGS } from '../net/protocol';
import { CAP_CHOICES, multiplayerModel, type MultiplayerState } from './MultiplayerScreen';

const ready: MultiplayerState = { name: 'Ana', code: 'ABCD-2345', settings: DEFAULT_ROOM_SETTINGS, webGpu: true };

describe('multiplayerModel', () => {
  it('lets a named player on a WebGPU browser create a room, and join one with a valid code', () => {
    expect(multiplayerModel(ready)).toEqual({ canCreate: true, canJoin: true, message: undefined });
    expect(multiplayerModel({ ...ready, code: 'nope' })).toMatchObject({ canCreate: true, canJoin: false });
  });

  it('needs a name', () => {
    expect(multiplayerModel({ ...ready, name: '   ' })).toMatchObject({ canCreate: false, canJoin: false });
  });

  it('turns away a browser without WebGPU, and waits while it checks', () => {
    expect(multiplayerModel({ ...ready, webGpu: false })).toEqual({ canCreate: false, canJoin: false, message: 'online.noWebGpu' });
    expect(multiplayerModel({ ...ready, webGpu: undefined })).toEqual({ canCreate: false, canJoin: false, message: 'online.checkingGpu' });
  });

  it('says why the server turned the player away', () => {
    expect(multiplayerModel({ ...ready, refusal: 'full' }).message).toBe('online.refused.full');
    expect(multiplayerModel({ ...ready, refusal: 'notFound' }).message).toBe('online.refused.notFound');
    expect(multiplayerModel({ ...ready, refusal: 'unreachable' }).message).toBe('online.unreachable');
  });

  it('refuses a second press while joining', () => {
    expect(multiplayerModel({ ...ready, busy: true })).toMatchObject({ canCreate: false, canJoin: false });
  });

  it('offers room sizes up to 50', () => {
    expect(CAP_CHOICES).toEqual([2, 5, 10, 20, 30, 40, 50]);
  });
});
