"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

const PERIODS = [
  { label: "День", value: "today" },
  { label: "Тиждень", value: "week" },
  { label: "Місяць", value: "month" },
  { label: "Все", value: "all" },
] as const;

export type Period = (typeof PERIODS)[number]["value"];

export const DEFAULT_PERIOD: Period = "all";

export function TimeSwitcher() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const current = (searchParams.get("period") as Period) || DEFAULT_PERIOD;

  const setPeriod = useCallback(
    (period: Period) => {
      const params = new URLSearchParams(searchParams.toString());
      if (period === DEFAULT_PERIOD) {
        params.delete("period");
      } else {
        params.set("period", period);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [searchParams, router, pathname]
  );

  return (
    <div className="time-switcher">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          className={`ts-btn${current === p.value ? " active" : ""}`}
          onClick={() => setPeriod(p.value)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
