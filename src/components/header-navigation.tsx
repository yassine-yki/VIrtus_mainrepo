"use client";
import { useId, useRef, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
export function HeaderNavigation({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  return (
    <div
      className="site-menu"
      data-open={open}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          button.current?.focus();
        }
      }}
    >
      <button
        ref={button}
        type="button"
        className="site-menu-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        Menu <Menu className="menu-open" size={18} aria-hidden="true" />
        <X className="menu-close" size={18} aria-hidden="true" />
      </button>
      <div
        id={id}
        className="site-menu-panel"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        {children}
      </div>
    </div>
  );
}
