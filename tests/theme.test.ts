import { describe, expect, it } from 'vitest';
import {
  isThemePreference,
  resolveTheme,
} from '../src/shared/theme';

describe('theme', () => {
  it('respeta las preferencias explícitas', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('sigue al sistema cuando la preferencia es system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('valida valores de preferencia', () => {
    expect(isThemePreference('light')).toBe(true);
    expect(isThemePreference('dark')).toBe(true);
    expect(isThemePreference('system')).toBe(true);
    expect(isThemePreference('auto')).toBe(false);
    expect(isThemePreference(undefined)).toBe(false);
  });
});
