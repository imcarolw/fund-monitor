export type FundEstimate = {
  fundCode: string;
  name: string;
  navDate: string;
  lastNav: number;
  estimatedNav: number;
  estimatedChangePercent: number;
  estimateTime: string;
  // true = live intraday estimate; false = last settled NAV (fallback when no
  // intraday data is available).
  live: boolean;
  // true = the intraday estimate was computed locally from top-10 holdings and
  // live stock quotes rather than provided by the platform.
  approx?: boolean;
  // NAV weight (%) of the holdings that were priced for an approximate estimate.
  coverage?: number;
};
