export interface CropData {
  id: number;
  state: string;
  district: string;
  year: number;
  crop: string;
  area: number;
  production: number;
  yield: number;
}

export interface SummaryData {
  totalProduction: number;
  avgYield: number;
  totalArea: number;
}

export interface TrendData {
  year: number;
  production: number;
  yield: number;
}

export interface StateComparisonData {
  state: string;
  production: number;
}

export interface CropDistributionData {
  crop: string;
  production: number;
}

export interface Filters {
  state: string;
  crop: string;
  year: string;
}
