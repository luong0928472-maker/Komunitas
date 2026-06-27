import { describe, it, expect } from 'vitest';

// Mirrors the stroop arithmetic used by the treasury service (7-decimal assets).
function addBig(a: string, b: string): string {
  return (BigInt(a) + BigInt(b)).toString();
}
function amountToStroops(amount: string): string {
  const [whole, frac = ''] = amount.split('.');
  const padded = (frac + '0000000').slice(0, 7);
  return (BigInt(whole) * 10_000_000n + BigInt(padded)).toString();
}
function availableStroops(contributed: string, released: string): bigint {
  const v = BigInt(contributed) - BigInt(released);
  return v > 0n ? v : 0n;
}

describe('treasury math', () => {
  it('parses Horizon decimal amounts to stroops', () => {
    expect(amountToStroops('1.0000000')).toBe('10000000');
    expect(amountToStroops('0.5')).toBe('5000000');
    expect(amountToStroops('100')).toBe('1000000000');
  });

  it('accumulates contributions in stroops', () => {
    expect(addBig('10000000', '5000000')).toBe('15000000');
    expect(addBig('0', '250000000')).toBe('250000000');
  });

  it('computes available balance and never goes negative', () => {
    expect(availableStroops('100000000', '40000000')).toBe(60000000n);
    expect(availableStroops('10000000', '50000000')).toBe(0n);
  });

  it('enforces the 0.1 unit minimum contribution', () => {
    const MIN = 1_000_000n;
    expect(BigInt(amountToStroops('0.05')) < MIN).toBe(true);
    expect(BigInt(amountToStroops('0.1')) >= MIN).toBe(true);
  });
});
