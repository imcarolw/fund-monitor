export type FundEstimate = {
  fundCode: string;
  name: string;
  navDate: string;
  lastNav: number;
  estimatedNav: number;
  estimatedChangePercent: number;
  estimateTime: string;
  // true = live intraday estimate (ETF/LOF); false = last settled NAV (open-end funds
  // no longer publish intraday estimates).
  live: boolean;
};
