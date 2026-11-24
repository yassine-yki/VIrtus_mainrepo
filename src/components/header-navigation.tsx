"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
export function HeaderNavigation({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      if (ref.current) ref.current.open = desktop.matches;
    };
    sync();
    desktop.addEventListener("change", sync);
    return () => desktop.removeEventListener("change", sync);
  }, []);
  return (
    <details ref={ref} className="site-menu" open>
      <summary>
        Menu <Menu className="menu-open" size={18} />
        <X className="menu-close" size={18} />
      </summary>
      {children}
    </details>
  );
}
