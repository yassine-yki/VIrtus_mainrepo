const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Casablanca",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export function casablancaDate(now = Date.now()): string {
  const parts = dateFormat.formatToParts(new Date(now));
  const value = (name: string) =>
    parts.find((part) => part.type === name)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function dateOnly(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? value
    : null;
}
export function deadlineOpen(
  deadline: string | null | undefined,
  now = Date.now(),
): boolean {
  return !deadline || deadline >= casablancaDate(now);
}
