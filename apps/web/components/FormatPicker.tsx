"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Conversion, CONVERSIONS, labelFor } from "@/lib/formats";

type PickerAnalytics = {
  slug: string;
  total: number;
  trend?: number[];
};

type FormatPickerProps = {
  selected?: Conversion;
  onSelect: (conversion: Conversion) => void;
};

const PICKER_CONVERSIONS = CONVERSIONS.slice(0, 26);

function conversionLabel(conversion: Conversion) {
  return conversion.label ?? `${labelFor(conversion.from)} to ${labelFor(conversion.to)}`;
}

function metricScore(metric: PickerAnalytics | undefined) {
  if (!metric) {
    return 0;
  }

  const recent = metric.trend?.reduce((sum, value) => sum + value, 0) ?? 0;
  return metric.total * 10 + recent;
}

export function FormatPicker({ selected, onSelect }: FormatPickerProps) {
  const [analytics, setAnalytics] = useState<PickerAnalytics[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const response = await fetch("/api/analytics/popular", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as { conversions?: PickerAnalytics[] };
        if (!cancelled) {
          setAnalytics(data.conversions ?? []);
        }
      } catch {
        if (!cancelled) {
          setAnalytics([]);
        }
      }
    }

    refresh();
    const interval = window.setInterval(refresh, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const rankedConversions = useMemo(() => {
    const metrics = new Map(analytics.map((item) => [item.slug, item]));
    return [...PICKER_CONVERSIONS].sort((left, right) => {
      const scoreDifference = metricScore(metrics.get(right.slug)) - metricScore(metrics.get(left.slug));
      if (scoreDifference !== 0) {
        return scoreDifference;
      }
      return (right.priority ?? 0) - (left.priority ?? 0);
    });
  }, [analytics]);

  const hotSlugs = useMemo(() => {
    const rankedWithUsage = rankedConversions.filter((conversion) => metricScore(analytics.find((item) => item.slug === conversion.slug)) > 0);
    return new Set(rankedWithUsage.slice(0, 3).map((conversion) => conversion.slug));
  }, [analytics, rankedConversions]);

  return (
    <motion.div
      className="flex flex-wrap justify-center gap-2"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.025 } }
      }}
    >
      {rankedConversions.map((conversion) => {
        const active = selected?.slug === conversion.slug;
        const hot = hotSlugs.has(conversion.slug);
        return (
          <motion.button
            key={conversion.slug}
            type="button"
            onClick={() => onSelect(conversion)}
            title={hot ? "Popular with users" : undefined}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition ${
              active
                ? hot
                  ? "border-amber-300 bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 text-white shadow-[0_0_24px_rgba(249,115,22,0.36)]"
                  : "border-accent bg-accent text-white"
                : hot
                  ? "border-orange-400/80 bg-gradient-to-r from-red-500/25 via-orange-500/20 to-amber-300/15 text-orange-50 shadow-[0_0_22px_rgba(249,115,22,0.18)] hover:border-amber-200 hover:text-white"
                  : "border-border bg-surface text-zinc-300 hover:border-accent hover:text-white"
            }`}
            variants={{
              hidden: { opacity: 0, y: 8 },
              show: { opacity: 1, y: 0 }
            }}
          >
            {hot ? <Flame className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
            <span>{conversionLabel(conversion)}</span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
