import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../api/client";
import { MASTER } from "../../api/endpoints";
import { useTheme } from "../../shared/theme/useTheme";

type HeatmapResponse = {
  month: string;
  days: Array<{ date: string; count: number }>;
  maxPerDay: number;
};

type Props = {
  month: string;
};

export function MonthHeatmap({ month }: Props) {
  const { colors } = useTheme();
  const { data } = useQuery({
    queryKey: ["appointmentsHeatmap", { month }],
    queryFn: async () => {
      const { data } = await apiClient.get<HeatmapResponse>(
        `${MASTER.appointmentsHeatmap}?month=${encodeURIComponent(month)}`
      );
      return data;
    },
  });

  const buckets = useMemo(() => {
    const byDate = new Map<string, number>();
    data?.days?.forEach((d) => byDate.set(d.date, d.count));
    return byDate;
  }, [data]);

  const daysInMonth = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    if (!y || !m) return 30;
    return new Date(y, m, 0).getDate();
  }, [month]);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Нагрузка по дням</Text>
      <View style={styles.row}>
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const date = `${month}-${String(day).padStart(2, "0")}`;
          const count = buckets.get(date) ?? 0;
          const alpha =
            !data?.maxPerDay || count === 0 ? 0.08 : Math.min(0.2 + count / data.maxPerDay, 1);
          return (
            <View
              key={date}
              style={[
                styles.cell,
                {
                  backgroundColor: colors.accent,
                  opacity: alpha,
                  borderColor: colors.borderLight,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 10 },
  title: { fontSize: 13, fontWeight: "700", marginBottom: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  cell: { width: 12, height: 12, borderRadius: 3, borderWidth: 1 },
});
