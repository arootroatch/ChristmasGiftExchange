import {describe, it, expect} from 'vitest';
import {formatPrice, toSmallestUnit, currencyDecimals} from '../../src/dashboard/formatPrice.js';

describe('formatPrice', () => {
  it('formats USD cents to dollar string', () => {
    expect(formatPrice(2500, 'USD')).toBe('$25.00');
  });

  it('formats 0 as empty string', () => {
    expect(formatPrice(0, 'USD')).toBe('');
  });

  it('formats EUR cents', () => {
    expect(formatPrice(1050, 'EUR')).toContain('10');
    expect(formatPrice(1050, 'EUR')).toContain('50');
  });

  it('formats JPY without decimals', () => {
    expect(formatPrice(2500, 'JPY')).toBe('¥2,500');
  });

  it('formats GBP', () => {
    expect(formatPrice(999, 'GBP')).toBe('£9.99');
  });
});

describe('toSmallestUnit', () => {
  it('converts dollar amount to cents for USD', () => {
    expect(toSmallestUnit(25.50, 'USD')).toBe(2550);
  });

  it('converts whole yen for JPY', () => {
    expect(toSmallestUnit(2500, 'JPY')).toBe(2500);
  });

  it('rounds to nearest cent', () => {
    expect(toSmallestUnit(4.999, 'USD')).toBe(500);
  });
});

describe('currencyDecimals', () => {
  it('returns 2 for USD', () => {
    expect(currencyDecimals('USD')).toBe(2);
  });

  it('returns 0 for JPY', () => {
    expect(currencyDecimals('JPY')).toBe(0);
  });
});
