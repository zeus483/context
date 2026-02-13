import { readData } from "../../../../lib/store";
import { SessionForm } from "./session-form";

export default async function SessionPage({ params }: { params: { dayId: string } }) {
  const data = await readData();
  const day = data.plan.days.find((d: any) => d.id === params.dayId);
  if (!day) return <div>No encontrado</div>;
  return <SessionForm day={day} />;
}
