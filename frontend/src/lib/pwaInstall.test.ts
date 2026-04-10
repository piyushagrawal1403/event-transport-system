import { describe, expect, it } from 'vitest';
import { isIosDevice, isSafariBrowser } from './pwaInstall';

describe('pwaInstall helpers', () => {
  it('detects iPhone and iPad user agents', () => {
    expect(isIosDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'iPhone', 0)).toBe(true);
    expect(isIosDevice('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', 'iPad', 0)).toBe(true);
  });

  it('detects iPadOS desktop mode via touch points', () => {
    expect(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5)).toBe(true);
  });

  it('detects Safari and excludes iOS Chrome', () => {
    const safariUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    const chromeUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1';

    expect(isSafariBrowser(safariUa)).toBe(true);
    expect(isSafariBrowser(chromeUa)).toBe(false);
  });
});

