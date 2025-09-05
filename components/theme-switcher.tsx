"use client";

import { useTheme } from './theme-provider';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'contrast', label: 'Contrast', icon: Monitor },
  ] as const;

  return (
    <div className="flex items-center bg-theme-surface rounded-lg p-1 border border-theme-border w-full justify-center">
      {themes.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant="ghost"
          size="sm"
          onClick={() => setTheme(value)}
          className={`flex-1 px-2 py-1.5 rounded-md transition-all h-7 flex items-center justify-center ${
            theme === value
              ? 'bg-theme-accent text-theme-accent-foreground shadow-sm'
              : 'text-theme-muted hover:text-theme-foreground hover:bg-theme-surface-hover'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
        </Button>
      ))}
    </div>
  );
}
