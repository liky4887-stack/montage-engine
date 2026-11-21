import { describe, expect, it } from 'vitest';
import { safeJoin, isKilledByAndroid } from '../src/ffmpeg.js';

describe('path safety', () => {
  it('blocks traversal', () => {
    expect(() => safeJoin('/data/media', '../../etc/passwd')).toThrow();
    expect(safeJoin('/data/media', 'clip.mp4')).toBe('/data/media/clip.mp4');
  });
});

describe('android kills', () => {
  it('flags signal 9 style exits', () => {
    expect(isKilledByAndroid(137)).toBe(true);
    expect(isKilledByAndroid(1)).toBe(false);
  });
});
