import { describe, it, expect } from 'vitest';
import { formatAmount, toStroops, truncateAddress, txUrl, votePercentage } from '@/lib/utils';

describe('lib/utils', () => {
  describe('formatAmount (stroops -> human)', () => {
    it('formats one whole unit', () => {
      expect(formatAmount('10000000')).toBe('1');
    });
    it('formats fractional amounts', () => {
      expect(formatAmount('12500000')).toBe('1.25');
    });
    it('handles zero', () => {
      expect(formatAmount('0')).toBe('0');
    });
    it('groups thousands', () => {
      expect(formatAmount('10000000000')).toBe('1,000');
    });
  });

  describe('toStroops (human -> stroops)', () => {
    it('converts whole numbers', () => {
      expect(toStroops('1')).toBe('10000000');
    });
    it('converts decimals', () => {
      expect(toStroops('1.25')).toBe('12500000');
    });
    it('rejects negatives', () => {
      expect(toStroops('-5')).toBe('0');
    });
    it('round-trips with formatAmount', () => {
      expect(formatAmount(toStroops('42.5'))).toBe('42.5');
    });
  });

  describe('truncateAddress', () => {
    it('truncates long keys', () => {
      const addr = 'GBL5RJKF4QNJ4ZPLJZ7PS7K5A4J44VEZJRV2CRTFFDRVSY2N76AIIE47';
      const r = truncateAddress(addr);
      expect(r).toContain('…');
      expect(r.length).toBeLessThan(addr.length);
    });
    it('keeps short strings intact', () => {
      expect(truncateAddress('ABCD')).toBe('ABCD');
    });
  });

  describe('votePercentage', () => {
    it('returns 0 with no votes', () => {
      expect(votePercentage('0', '0')).toBe(0);
    });
    it('computes 60%', () => {
      expect(votePercentage('3', '5')).toBe(60);
    });
    it('computes 100%', () => {
      expect(votePercentage('5', '5')).toBe(100);
    });
  });

  describe('txUrl', () => {
    it('points at testnet explorer', () => {
      expect(txUrl('abc')).toBe('https://stellar.expert/explorer/testnet/tx/abc');
    });
  });
});
