const DAY_MS = 86_400_000;
export const APP_TIMEZONE = "America/Bogota";

function intlDateKey(date: Date, timeZone = APP_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return date.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function fromDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function todayKey() {
  return intlDateKey(new Date());
}

export function addDays(dateKey: string, amount: number) {
  const date = fromDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateKey(date);
}

export function daysBetween(start: string, end: string) {
  const startDate = fromDateKey(start).getTime();
  const endDate = fromDateKey(end).getTime();
  return Math.round((endDate - startDate) / DAY_MS);
}

export function mondayOf(dateKey: string) {
  const date = fromDateKey(dateKey);
  const day = date.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + delta);
  return toDateKey(date);
}

export function weekBounds(dateKey: string) {
  const startKey = mondayOf(dateKey);
  return {
    startKey,
    endKey: addDays(startKey, 6)
  };
}

export function monthBounds(monthKey?: string) {
  const base = monthKey ? fromDateKey(`${monthKey}-01`) : fromDateKey(`${todayKey().slice(0, 7)}-01`);
  const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
  const end = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0));
  return {
    startKey: toDateKey(start),
    endKey: toDateKey(end)
  };
}

export function monthBoundsFromDate(dateKey: string) {
  const base = fromDateKey(dateKey);
  const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
  const end = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0));
  return {
    startKey: toDateKey(start),
    endKey: toDateKey(end)
  };
}

export function formatLongDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: APP_TIMEZONE
  });
}
