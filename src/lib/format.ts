import type { Workplace } from "./types";
export const workplaceLabels: Record<Workplace, string> = {
  onsite: "Sur site",
  hybrid: "Hybride",
  remote: "À distance",
  unknown: "Mode non précisé",
};
export const number = (value: number) =>
  new Intl.NumberFormat("fr-MA").format(value);
export function deadlineLabel(value: string | null | undefined): string {
  if (!value) return "Non précisée";
  return new Intl.DateTimeFormat("fr-MA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}
export function shortDate(value: string | null): string {
  if (!value) return "Date non précisée";
  return new Intl.DateTimeFormat("fr-MA", {
    day: "numeric",
    month: "short",
    timeZone: "Africa/Casablanca",
  }).format(new Date(value));
}
export function age(value: string | null, now = Date.now()): string {
  if (!value) return "Publication non datée";
  const days = Math.max(0, Math.floor((now - Date.parse(value)) / 86_400_000));
  return days === 0
    ? "Aujourd’hui"
    : days === 1
      ? "Hier"
      : `Il y a ${days} jours`;
}
