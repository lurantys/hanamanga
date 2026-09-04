"use client";

import { useSyncExternalStore } from "react";
import {
  getReadSnapshot,
  subscribeReadState,
} from "@/lib/read-state";
import {
  estimateSeriesSeconds,
  formatEta,
  useSecPerPage,
} from "@/lib/eta";

type SeriesEtaProps = {
  mangaId: string;
  /** Chapter ids in reading order (used to count what's unread). */
  chapterIds: string[];
  /** Average pages per chapter, computed server-side from known counts. */
  avgPagesPerChapter?: number;
  alternateIds?: (string | null | undefined)[];
  className?: string;
};

const EMPTY_MAP = {};

export function SeriesEta({
  mangaId,
  chapterIds,
  avgPagesPerChapter = 20,
  alternateIds,
  className = "text-sm text-zinc-500",
}: SeriesEtaProps) {
  const secPerPage = useSecPerPage();
  const readMap = useSyncExternalStore(
    subscribeReadState,
    getReadSnapshot,
    () => EMPTY_MAP as ReturnType<typeof getReadSnapshot>,
  );

  const total = chapterIds.length;
  if (total === 0) return null;

  const keys = [mangaId, ...(alternateIds ?? []).filter(Boolean)] as string[];
  let readCount = 0;
  for (const id of chapterIds) {
    for (const key of keys) {
      if (readMap[key]?.[id]) {
        readCount += 1;
        break;
      }
    }
  }
  const unread = Math.max(0, total - readCount);
  if (unread === 0) {
    return (
      <span className={className}>
        All caught up · ~{formatEta(estimateSeriesSeconds(total, avgPagesPerChapter, secPerPage))} total
      </span>
    );
  }
  if (readCount === 0) {
    return (
      <span className={className}>
        {total.toLocaleString()} chapters · ~
        {formatEta(estimateSeriesSeconds(total, avgPagesPerChapter, secPerPage))} total
      </span>
    );
  }
  return (
    <span className={className}>
      {unread.toLocaleString()} unread · ~
      {formatEta(estimateSeriesSeconds(unread, avgPagesPerChapter, secPerPage))} left
    </span>
  );
}
