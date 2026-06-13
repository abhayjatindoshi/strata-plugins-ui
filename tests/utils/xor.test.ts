import { describe, it, expect } from 'vitest';
import { xorEncode, xorDecode } from '@/utils/xor';

describe('xor', () => {
  it('round-trips ascii text', () => {
    const enc = xorEncode('hello world', 'key');
    expect(enc).not.toBe('hello world');
    expect(xorDecode(enc, 'key')).toBe('hello world');
  });

  it('returns empty base64 for empty text (loop body never runs)', () => {
    const enc = xorEncode('', 'key');
    expect(enc).toBe('');
    expect(xorDecode('', 'key')).toBe('');
  });

  it('wraps a key shorter than the text via modulo', () => {
    const enc = xorEncode('abcdefghij', 'k');
    expect(xorDecode(enc, 'k')).toBe('abcdefghij');
  });

  it('handles a key longer than the text', () => {
    const enc = xorEncode('hi', 'a-very-long-key');
    expect(xorDecode(enc, 'a-very-long-key')).toBe('hi');
  });

  it('produces valid base64 output', () => {
    const enc = xorEncode('payload-123', 'secret');
    expect(() => atob(enc)).not.toThrow();
  });

  it('round-trips JSON payloads (provider credential cache shape)', () => {
    const payload = JSON.stringify({ tenantId: 't-1', credential: 'pw' });
    const enc = xorEncode(payload, 'device-id');
    expect(JSON.parse(xorDecode(enc, 'device-id'))).toEqual({ tenantId: 't-1', credential: 'pw' });
  });
});
