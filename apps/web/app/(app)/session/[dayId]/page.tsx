import { SessionForm } from "./session-form";

type Props = {
  params: { dayId: string };
  searchParams: { date?: string };
};

export default function SessionPage({ params, searchParams }: Props) {
  return <SessionForm workoutDayId={params.dayId} dateKey={searchParams.date} />;
}
