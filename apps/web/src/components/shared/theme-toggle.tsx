"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8 rounded-[6px] bg-[var(--surface-sunken)] border border-[var(--border)]" />;
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center justify-center w-8 h-8 rounded-[6px] bg-[var(--surface-1)] hover:bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-xs cursor-pointer"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-[var(--accent)]" />
      ) : (
        <Moon className="w-4 h-4 text-[var(--primary)]" />
      )}
    </button>
  );
}
