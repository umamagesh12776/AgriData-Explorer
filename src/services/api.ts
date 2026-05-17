import { Filters, SummaryData, TrendData, StateComparisonData, CropDistributionData } from "../types";

export const api = {
  getStates: async () => {
    const res = await fetch("/api/states");
    return res.json();
  },
  getCrops: async () => {
    const res = await fetch("/api/crops");
    return res.json();
  },
  getSummary: async (filters: Filters): Promise<SummaryData> => {
    const params = new URLSearchParams(filters as any);
    const res = await fetch(`/api/analytics/summary?${params}`);
    return res.json();
  },
  getTrends: async (filters: Partial<Filters>): Promise<TrendData[]> => {
    const params = new URLSearchParams(filters as any);
    const res = await fetch(`/api/analytics/trends?${params}`);
    return res.json();
  },
  getStateComparison: async (filters: Partial<Filters>): Promise<StateComparisonData[]> => {
    const params = new URLSearchParams(filters as any);
    const res = await fetch(`/api/analytics/state-comparison?${params}`);
    return res.json();
  },
  getCropDistribution: async (filters: Partial<Filters>): Promise<CropDistributionData[]> => {
    const params = new URLSearchParams(filters as any);
    const res = await fetch(`/api/analytics/crop-distribution?${params}`);
    return res.json();
  },
  generateAIInsight: async (dataSummary: string) => {
    const res = await fetch("/api/insights/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataSummary }),
    });
    return res.json();
  },
  resetData: async () => {
    const res = await fetch("/api/data/reset", { method: "POST" });
    return res.json();
  },
  uploadData: async (data: any[], mode: 'replace' | 'merge') => {
    const res = await fetch("/api/data/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, mode }),
    });
    return res.json();
  }
};
