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
    year: "numeric",
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

export function publicationLabel(
  value: string | null,
  now = Date.now(),
): string {
  if (!value) return "Publication non datée";
  return now - Date.parse(value) > 30 * 86_400_000
    ? `Publiée le ${shortDate(value)}`
    : `Publiée ${age(value, now).toLowerCase()}`;
}

export function sourceOverdue(
  checkedAt: string | null,
  now = Date.now(),
): boolean {
  return (
    !checkedAt ||
    !Number.isFinite(Date.parse(checkedAt)) ||
    now - Date.parse(checkedAt) > 24 * 3600_000
  );
}
