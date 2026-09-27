import { describe, expect, it } from 'vitest';
import { DEFAULT_SURFER } from '../game/SurferChoice';
import { cleanName, lookFor, parseClientMessage, parseRoomSettings, parseServerMessage, surferFor } from './protocol';

const settings = { spot: 'canyon', conditions: { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, cap: 50 };

describe('protocol', () => {
  it('cleans names: trims, collapses spaces, strips control characters, 16 at most', () => {
    expect(cleanName('  Ana \n  Rita ')).toBe('Ana Rita');
    expect(cleanName('a'.repeat(40))).toHaveLength(16);
    expect(cleanName('Zé\u0007')).toBe('Zé');
    expect(cleanName('   ')).toBeUndefined();
    expect(cleanName(42)).toBeUndefined();
  });

  it('accepts only known spots, conditions and caps', () => {
    expect(parseRoomSettings(settings)).toEqual(settings);
    expect(parseRoomSettings({ ...settings, cap: 51 })).toBeUndefined();
    expect(parseRoomSettings({ ...settings, cap: 1 })).toBeUndefined();
    expect(parseRoomSettings({ ...settings, cap: 2.5 })).toBeUndefined();
    expect(parseRoomSettings({ ...settings, spot: 'bells' })).toBeUndefined();
    expect(parseRoomSettings({ ...settings, conditions: { ...settings.conditions, swell: 'huge' } })).toBeUndefined();
    expect(parseRoomSettings(null)).toBeUndefined();
  });

  it('parses client messages and drops anything else', () => {
    expect(parseClientMessage('{"type":"ping","t":12.5}')).toEqual({ type: 'ping', t: 12.5 });
    expect(parseClientMessage('{"type":"call","call":"party"}')).toEqual({ type: 'call', call: 'party' });
    expect(parseClientMessage('{"type":"call","call":"cowabunga"}')).toBeUndefined();
    expect(parseClientMessage('{"type":"kick","id":"3"}')).toBeUndefined();
    expect(parseClientMessage('{"type":"kick","id":3}')).toEqual({ type: 'kick', id: 3 });
    expect(parseClientMessage('{"type":"ride","distance":42,"seconds":6.1}')).toEqual({ type: 'ride', distance: 42, seconds: 6.1 });
    expect(parseClientMessage('{"type":"ride","distance":-1,"seconds":6.1}')).toBeUndefined();
    expect(parseClientMessage('not json')).toBeUndefined();
    expect(parseClientMessage('[1,2]')).toBeUndefined();
  });

  it('parses hellos, cleaning the name and code', () => {
    const look = lookFor(DEFAULT_SURFER);
    const join = { type: 'join', build: 'dev', code: 'abcd-2345', name: ' Ana ', look };
    expect(parseClientMessage(JSON.stringify(join))).toEqual({ ...join, code: 'ABCD2345', name: 'Ana' });
    const token = '0123456789abcdef0123456789abcdef';
    expect(parseClientMessage(JSON.stringify({ ...join, token }))).toMatchObject({ token });
    expect(parseClientMessage(JSON.stringify({ ...join, token: 'short' }))).toBeUndefined();
    expect(parseClientMessage(JSON.stringify({ ...join, code: 'nope' }))).toBeUndefined();
    const create = { type: 'create', build: 'dev', settings, name: 'Ana', look };
    expect(parseClientMessage(JSON.stringify(create))).toEqual(create);
    expect(parseClientMessage(JSON.stringify({ ...create, bots: 8 }))).toEqual({ ...create, bots: 8 });
    expect(parseClientMessage(JSON.stringify({ ...create, bots: 80 }))).toBeUndefined();
    expect(parseClientMessage(JSON.stringify({ ...create, name: '' }))).toBeUndefined();
    expect(parseClientMessage(JSON.stringify({ ...create, look: { ...look, body: 'x'.repeat(40) } }))).toBeUndefined();
  });

  it('reads server messages by their type', () => {
    expect(parseServerMessage('{"type":"left","id":3}')).toEqual({ type: 'left', id: 3 });
    expect(parseServerMessage('{"id":3}')).toBeUndefined();
    expect(parseServerMessage('nope')).toBeUndefined();
  });

  it('turns a look back into a surfer, falling back on unknown parts', () => {
    expect(surferFor({ body: 'surfer9', outfit: 'vest', color: 'coral', board: 'nope' })).toEqual({ ...DEFAULT_SURFER, outfit: 'vest', color: 'coral' });
  });
});
