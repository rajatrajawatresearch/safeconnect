"use client";

import {
  keepPreviousData,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { services, ServiceError, type AnalyticsScope } from "@/services";
import { usePrefsStore } from "@/stores/prefs-store";
import type { AnalyticsOverview, DensityCell } from "@/types";
import type { LoadState } from "./chart-kit";

const isOffline = (error: unknown) =>
  error instanceof ServiceError && error.code === "offline";

/** Maps a query onto the three states every chart panel renders. */
export function loadStateOf(query: UseQueryResult<unknown, Error>): LoadState {
  if (query.isPending) return { status: "pending" };
  if (query.isError)
    return {
      status: "error",
      offline: isOffline(query.error),
      retry: () => void query.refetch(),
    };
  return { status: "ready", refreshing: query.isPlaceholderData };
}

/** A request that failed because the connection dropped is retried once the connection is back. */
function useRetryWhenOnline(query: UseQueryResult<unknown, Error>) {
  const connectivity = usePrefsStore((s) => s.connectivity);
  const { refetch } = query;
  const failedOffline = query.isError && isOffline(query.error);
  useEffect(() => {
    if (failedOffline && connectivity !== "offline") void refetch();
  }, [failedOffline, connectivity, refetch]);
}

/**
 * Aggregated figures for a station, a district or the state.
 * Switching scope keeps the previous render on screen (dimmed) until the new slice arrives.
 */
export function useOverview(scope: AnalyticsScope): {
  overview: AnalyticsOverview | undefined;
  load: LoadState;
} {
  const query = useQuery({
    queryKey: ["analytics", "overview", scope],
    queryFn: () => services.analytics.getOverview(scope),
    placeholderData: keepPreviousData,
  });
  useRetryWhenOnline(query);
  return { overview: query.data, load: loadStateOf(query) };
}

/** Historical incident density by place. Fetched only when the layer is switched on. */
export function useDensity(enabled: boolean): {
  density: DensityCell[] | undefined;
  load: LoadState;
} {
  const query = useQuery({
    queryKey: ["analytics", "density"],
    queryFn: () => services.analytics.getDensity(),
    enabled,
  });
  useRetryWhenOnline(query);
  return { density: query.data, load: loadStateOf(query) };
}
