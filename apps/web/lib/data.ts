import { statusLabel } from "./workout";

export function beachProgress(goalDate: Date) {
  const left = Math.ceil((goalDate.getTime() - Date.now()) / 86_400_000);
  return Math.max(0, Math.min(100, Math.round(((56 - left) / 56) * 100)));
}

export function csvFromSessions(
  sessions: {
    date: Date;
    status: string;
    workoutDay: { title: string };
    notes: string | null;
    cardioEntry: { cardioType: string; minutes: number } | null;
  }[]
) {
  const header = "date,status,statusLabel,day,cardioType,cardioMinutes,notes";
  const rows = sessions.map((session) => {
    const notes = (session.notes ?? "").replace(/"/g, '""');
    return [
      session.date.toISOString(),
      session.status,
      statusLabel(session.status as any),
      session.workoutDay.title,
      session.cardioEntry?.cardioType ?? "",
      session.cardioEntry?.minutes ?? "",
      `"${notes}"`
    ].join(",");
  });

  return [header, ...rows].join("\n");
}
