const DAY_MS = 86_400_000;

export function toDateKey(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function fromDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function todayKey() {
  return toDateKey(new Date());
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

export function monthBounds(monthKey?: string) {
  const base = monthKey ? fromDateKey(`${monthKey}-01`) : fromDateKey(`${todayKey().slice(0, 7)}-01`);
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
    month: "short"
  });
}
