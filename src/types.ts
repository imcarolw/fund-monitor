export type Holding = {
  code: string;
  name: string;
  weight: number;
};

export type FundBasket = {
  id: string;
  name: string;
  amount: number;
  holdings: Holding[];
};

export type QuoteResult = {
  symbol: string;
  shortName: string;
  currency: string;
  price: number;
  previousClose: number;
  changePercent: number;
  updatedAt: string;
};

export type FundEstimate = {
  fundCode: string;
  name: string;
  navDate: string;
  lastNav: number;
  estimatedNav: number;
  estimatedChangePercent: number;
  estimateTime: string;
};
