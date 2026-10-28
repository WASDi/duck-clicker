import { describe, expect, it } from 'vitest';
import { formatGain, formatQuacks, formatRate } from './format';

describe('format', () => {
  it('rounds Quacks down with separators', () => {
    expect(formatQuacks(12000.9)).toBe('12,000');
  });

  it('shows rates with one decimal', () => {
    expect(formatRate(1234.56)).toBe('1,234.6');
    expect(formatRate(2)).toBe('2.0');
  });

  it('shows small gains with one decimal', () => {
    expect(formatGain(1)).toBe('1');
    expect(formatGain(1.27)).toBe('1.2');
    expect(formatGain(1520.7)).toBe('1,520');
  });
});
