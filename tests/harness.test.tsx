import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { xorEncode, xorDecode } from '@/utils/xor';

describe('plugins-ui test harness', () => {
  it('runs pure logic', () => {
    const enc = xorEncode('hello', 'key');
    expect(xorDecode(enc, 'key')).toBe('hello');
  });

  it('renders React with jsdom', () => {
    render(<div>harness-ok</div>);
    expect(screen.getByText('harness-ok')).toBeInTheDocument();
  });
});
