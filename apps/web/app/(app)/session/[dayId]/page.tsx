import { SessionForm } from "./session-form";

type Props = {
  params: { dayId: string };
  searchParams: { date?: string; planType?: "BASE" | "CUSTOM" };
};

export default function SessionPage({ params, searchParams }: Props) {
  return <SessionForm dayId={params.dayId} dateKey={searchParams.date} planType={searchParams.planType} />;
}
