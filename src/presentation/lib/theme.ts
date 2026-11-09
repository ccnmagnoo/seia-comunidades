import {
  isThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from '@/shared/theme';

export function getStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function getSystemDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(preference: ThemePreference): ResolvedTheme {
  if (typeof document === 'undefined') return 'light';

  const resolved = resolveTheme(preference, getSystemDark());
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Sin persistencia si el almacenamiento está bloqueado.
  }

  window.dispatchEvent(
    new CustomEvent('seia:theme', {
      detail: { preference, resolved },
    }),
  );

  void window.seia?.theme?.setNative(preference)?.catch(() => undefined);
  return resolved;
}

export function getResolvedTheme(): ResolvedTheme {
  return resolveTheme(getStoredPreference(), getSystemDark());
}

export function getThemeSnapshot(): string {
  return `${getStoredPreference()}:${getResolvedTheme()}`;
}

export function subscribeTheme(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const onTheme = () => listener();
  const onMedia = () => {
    if (getStoredPreference() === 'system') {
      applyTheme('system');
    }
    listener();
  };

  window.addEventListener('seia:theme', onTheme);
  media?.addEventListener('change', onMedia);

  return () => {
    window.removeEventListener('seia:theme', onTheme);
    media?.removeEventListener('change', onMedia);
  };
}
