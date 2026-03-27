export type Period = "today" | "week" | "month" | "all";

export function periodToDate(period: Period): Date | null {
  if (period === "all") return null;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === "today") return start;
  if (period === "week") {
    start.setDate(start.getDate() - 7);
    return start;
  }
  if (period === "month") {
    start.setDate(start.getDate() - 30);
    return start;
  }

  return null;
}

export function parsePeriod(value: string | null | undefined): Period {
  if (value === "today" || value === "week" || value === "month" || value === "all") {
    return value;
  }
  return "all";
}
