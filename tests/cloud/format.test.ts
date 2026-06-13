import { describe, it, expect } from 'vitest';
import { defaultFormatDate, defaultFormatSize } from '@/cloud/format';

describe('defaultFormatDate', () => {
  it('returns empty string for undefined input', () => {
    expect(defaultFormatDate(undefined)).toBe('');
  });

  it('returns empty string for an invalid date', () => {
    expect(defaultFormatDate('not-a-date')).toBe('');
  });

  it('formats a date in the current year without the year', () => {
    const now = new Date();
    const iso = new Date(now.getFullYear(), 5, 15).toISOString();
    const out = defaultFormatDate(iso);
    expect(out).not.toMatch(String(now.getFullYear()));
    expect(out.length).toBeGreaterThan(0);
  });

  it('formats a date in a different year with the year', () => {
    const out = defaultFormatDate('2001-03-04T00:00:00.000Z');
    expect(out).toMatch('2001');
  });
});

describe('defaultFormatSize', () => {
  it('returns em-dash for undefined', () => {
    expect(defaultFormatSize(undefined)).toBe('—');
  });

  it('returns em-dash for non-finite', () => {
    expect(defaultFormatSize(Infinity)).toBe('—');
  });

  it('formats bytes under 1KB', () => {
    expect(defaultFormatSize(512)).toBe('512 B');
  });

  it('formats KB with one decimal when under 10', () => {
    expect(defaultFormatSize(1536)).toBe('1.5 KB');
  });

  it('formats KB without decimals when 10 or larger', () => {
    expect(defaultFormatSize(20 * 1024)).toBe('20 KB');
  });

  it('caps the unit at TB for very large values', () => {
    expect(defaultFormatSize(5 * 1024 ** 4)).toBe('5.0 TB');
  });
});
