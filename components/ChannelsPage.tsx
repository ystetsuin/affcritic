"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar, SidebarDrawer } from "./Sidebar";

interface Category {
  id: string;
  name: string;
  slug: string;
  channelCount: number;
}

interface ChannelStats {
  today: number;
  week: number;
  month: number;
  allTime: number;
}

interface ChannelData {
  id: string;
  username: string;
  displayName: string | null;
  isActive: boolean;
  categories: { id: string; name: string; slug: string }[];
  stats: ChannelStats;
  share: ChannelStats;
}

interface Totals {
  today: number;
  week: number;
  month: number;
  allTime: number;
}

interface ChannelsPageProps {
  channels: ChannelData[];
  categories: Category[];
  totals: Totals;
}

function formatStat(count: number, share: number) {
  if (count === 0) return "0";
  const pct = Math.round(share * 100);
  return `${count} (${pct}%)`;
}

export function ChannelsPage({ channels, categories, totals }: ChannelsPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filtered = selectedCategory
    ? channels.filter((ch) => ch.categories.some((c) => c.slug === selectedCategory))
    : channels;

  // Sort by allTime share DESC
  const sorted = [...filtered].sort((a, b) => b.share.allTime - a.share.allTime);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Channels</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {channels.length} каналів
            </p>
          </div>
          <div className="hidden text-right text-xs text-muted-foreground sm:block">
            <span>Сьогодні: <b className="text-foreground">{totals.today}</b></span>
            <span className="mx-1.5">·</span>
            <span>Тиждень: <b className="text-foreground">{totals.week}</b></span>
            <span className="mx-1.5">·</span>
            <span>Місяць: <b className="text-foreground">{totals.month}</b></span>
            <span className="mx-1.5">·</span>
            <span>Всього: <b className="text-foreground">{totals.allTime}</b></span>
          </div>
          <div className="sm:hidden">
            <SidebarDrawer
              groups={[]}
              mode="channels"
              channelCategories={categories}
              activeCategorySlug={selectedCategory}
              onCategorySelect={setSelectedCategory}
            />
          </div>
        </div>
      </header>

      <div className="flex gap-8">
        <main className="min-w-0 flex-1">
          {/* Mobile totals */}
          <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground sm:hidden">
            <span>Сьогодні: <b className="text-foreground">{totals.today}</b></span>
            <span>Тиждень: <b className="text-foreground">{totals.week}</b></span>
            <span>Місяць: <b className="text-foreground">{totals.month}</b></span>
            <span>Всього: <b className="text-foreground">{totals.allTime}</b></span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 pr-4">Канал</th>
                  <th className="hidden pb-2 pr-4 md:table-cell">Категорії</th>
                  <th className="pb-2 pr-4 text-right">День</th>
                  <th className="pb-2 pr-4 text-right">Тиждень</th>
                  <th className="pb-2 pr-4 text-right">Місяць</th>
                  <th className="pb-2 text-right">Всього</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((ch) => (
                  <tr key={ch.id} className="group">
                    <td className="py-2.5 pr-4">
                      <Link
                        href={`/channels/${ch.username}/`}
                        className="font-medium text-foreground transition-colors hover:text-foreground/70"
                      >
                        @{ch.username}
                      </Link>
                      {ch.displayName && (
                        <span className="ml-1.5 text-xs text-muted-foreground">{ch.displayName}</span>
                      )}
                      {!ch.isActive && (
                        <span className="ml-1.5 rounded-sm bg-red-50 px-1 py-0.5 text-[10px] text-red-600">off</span>
                      )}
                      {/* Mobile categories */}
                      {ch.categories.length > 0 && (
                        <div className="mt-0.5 flex flex-wrap gap-1 md:hidden">
                          {ch.categories.map((c) => (
                            <span key={c.id} className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              {c.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="hidden py-2.5 pr-4 md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {ch.categories.map((c) => (
                          <span key={c.id} className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-right tabular-nums">
                      {formatStat(ch.stats.today, ch.share.today)}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-right tabular-nums">
                      {formatStat(ch.stats.week, ch.share.week)}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-right tabular-nums">
                      {formatStat(ch.stats.month, ch.share.month)}
                    </td>
                    <td className="whitespace-nowrap py-2.5 text-right tabular-nums font-medium">
                      {formatStat(ch.stats.allTime, ch.share.allTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sorted.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Немає каналів{selectedCategory ? " у цій категорії" : ""}
            </p>
          )}
        </main>

        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <Sidebar
            groups={[]}
            mode="channels"
            channelCategories={categories}
            activeCategorySlug={selectedCategory}
            onCategorySelect={setSelectedCategory}
          />
        </aside>
      </div>
    </div>
  );
}
