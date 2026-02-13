export const beachProgress = (goalDate: Date) => {
  const left = Math.ceil((goalDate.getTime() - Date.now()) / 86400000);
  return Math.max(0, Math.min(100, Math.round(((56 - left) / 56) * 100)));
};

export const csvFromSessions = (sessions: { date: Date; status: string; notes: string | null }[]) =>
  ["date,status,notes", ...sessions.map((s) => `${s.date.toISOString()},${s.status},\"${s.notes ?? ""}\"`)].join("\n");
