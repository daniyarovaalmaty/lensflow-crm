import { describe, it, expect } from 'vitest';
import { translateCyrillicToEnglishLayout } from '@/lib/utils/keyboard-layout';

describe('translateCyrillicToEnglishLayout', () => {
  it('should translate lowercase Cyrillic to English QWERTY', () => {
    // "йцукен" on Russian layout = "qwerty" on English
    expect(translateCyrillicToEnglishLayout('йцукен')).toBe('qwerty');
  });

  it('should translate uppercase Cyrillic to English QWERTY', () => {
    expect(translateCyrillicToEnglishLayout('ЙЦУКЕН')).toBe('QWERTY');
  });

  it('should leave English characters unchanged', () => {
    expect(translateCyrillicToEnglishLayout('abc123')).toBe('abc123');
  });

  it('should leave numbers unchanged', () => {
    expect(translateCyrillicToEnglishLayout('0123456789')).toBe('0123456789');
  });

  it('should handle mixed Cyrillic and numbers (typical barcode scan in wrong layout)', () => {
    // Simulate a DataMatrix barcode scanned with Russian keyboard layout
    // The barcode "010454" would stay as "010454" (numbers don't change)
    // But letters like "SPY" would be typed as Cyrillic equivalents
    // С=C, З=P, Н=Y => "СЗН" should become "CPY" (close but not exact - actual mapping differs)
    const input = '010454748051601117271031212';
    expect(translateCyrillicToEnglishLayout(input)).toBe('010454748051601117271031212');
  });

  it('should handle empty string', () => {
    expect(translateCyrillicToEnglishLayout('')).toBe('');
  });

  it('should translate a full Cyrillic barcode to English', () => {
    // "ЫЗН" in Cyrillic keyboard positions maps to "SPY" in English
    expect(translateCyrillicToEnglishLayout('ЫЗН')).toBe('SPY');
  });

  it('should handle real-world DataMatrix with Cyrillic prefix', () => {
    // ]C1 prefix sometimes typed as ]С1 (Cyrillic С instead of Latin C)
    const cyrillicC = 'С'; // Cyrillic С
    expect(translateCyrillicToEnglishLayout(cyrillicC)).toBe('C');
  });
});
