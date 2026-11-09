import { Monitor, Moon, Sun } from 'lucide-react';
import type { ThemePreference } from '@/shared/theme';
import { useTheme } from '../hooks/useTheme';
import { applyTheme } from '../lib/theme';
import { cn } from '../lib/utils';

const OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}> = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { preference } = useTheme();

  return (
    <div
      role="group"
      aria-label="Tema de la aplicación"
      className={cn(
        'grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted/40 p-1',
        className,
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            title={`Tema ${label.toLowerCase()}`}
            aria-label={`Tema ${label.toLowerCase()}`}
            aria-pressed={active}
            onClick={() => applyTheme(value)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg px-1.5 py-1.5 text-[10px] font-medium transition',
              active
                ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default ThemeToggle;
