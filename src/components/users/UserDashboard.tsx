"use client";

import React from "react";
import { DauChartSection } from "./DauChartSection";
import { RetentionHeatmap } from "./RetentionHeatmap";
import { ChartData } from "chart.js";
import {
  ChartProcessedItem,
  CombinedCohortRow,
  CustomTooltipState,
  PeriodType,
  RetentionDayMax,
  RetentionMode,
  ViewMode
} from "@/types/dashboard";

interface UserDashboardProps {
  periodType: PeriodType;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  downloadCSV: () => void;
  avgDau: number;
  totalNewUsers: number;
  loading: boolean;
  chartProcessedData: ChartProcessedItem[];
  dauChartData: ChartData<"line">;
  dauChartOptions: any;
  retentionMode: RetentionMode;
  setRetentionMode: (mode: RetentionMode) => void;
  retentionDayMax: RetentionDayMax;
  setRetentionDayMax: (day: RetentionDayMax) => void;
  visitRowsLength: number;
  decayChartData: ChartData<"line">;
  decayChartOptions: any;
  activeDayColumns: number[];
  combinedCohortRows: CombinedCohortRow[];
  setHeatmapTooltip: (tooltip: CustomTooltipState | null) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  periodType,
  viewMode,
  setViewMode,
  downloadCSV,
  avgDau,
  totalNewUsers,
  loading,
  chartProcessedData,
  dauChartData,
  dauChartOptions,
  retentionMode,
  setRetentionMode,
  retentionDayMax,
  setRetentionDayMax,
  visitRowsLength,
  decayChartData,
  decayChartOptions,
  activeDayColumns,
  combinedCohortRows,
  setHeatmapTooltip,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. DAU & New User Chart / Table Section */}
      <DauChartSection
        periodType={periodType}
        viewMode={viewMode}
        setViewMode={setViewMode}
        downloadCSV={downloadCSV}
        avgDau={avgDau}
        totalNewUsers={totalNewUsers}
        loading={loading}
        chartProcessedData={chartProcessedData}
        dauChartData={dauChartData}
        dauChartOptions={dauChartOptions}
      />

      {/* 2. Retention Heatmap Section */}
      <RetentionHeatmap
        retentionMode={retentionMode}
        setRetentionMode={setRetentionMode}
        retentionDayMax={retentionDayMax}
        setRetentionDayMax={setRetentionDayMax}
        loading={loading}
        visitRowsLength={visitRowsLength}
        decayChartData={decayChartData}
        decayChartOptions={decayChartOptions}
        activeDayColumns={activeDayColumns}
        combinedCohortRows={combinedCohortRows}
        setHeatmapTooltip={setHeatmapTooltip}
      />
    </div>
  );
};
