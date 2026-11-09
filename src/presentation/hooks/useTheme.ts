import { useSyncExternalStore } from 'react';
import type { ResolvedTheme, ThemePreference } from '@/shared/theme';
import { getThemeSnapshot, subscribeTheme } from '../lib/theme';

export function useTheme(): {
  preference: ThemePreference;
  resolved: ResolvedTheme;
} {
  const snapshot = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    () => 'system:light',
  );
  const [preference, resolved] = snapshot.split(':') as [
    ThemePreference,
    ResolvedTheme,
  ];
  return { preference, resolved };
}
