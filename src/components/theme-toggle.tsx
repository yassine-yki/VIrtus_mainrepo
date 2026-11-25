"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem("virtus-theme");
      } catch {}
      const next = saved === "dark" || (saved !== "light" && system.matches);
      document.documentElement.dataset.theme = next ? "dark" : "light";
      setDark(next);
    };
    sync();
    system.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    return () => {
      system.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={dark ? "Activer le mode clair" : "Activer le mode sombre"}
      aria-pressed={dark}
      title={dark ? "Mode clair" : "Mode sombre"}
      onClick={() => {
        const next = !dark;
        document.documentElement.dataset.theme = next ? "dark" : "light";
        try {
          localStorage.setItem("virtus-theme", next ? "dark" : "light");
        } catch {}
        setDark(next);
      }}
    >
      {dark ? (
        <Sun size={19} aria-hidden="true" />
      ) : (
        <Moon size={19} aria-hidden="true" />
      )}
    </button>
  );
}
