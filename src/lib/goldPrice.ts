import type { QuoteResult } from '../types';

const GOLD_SYMBOL = 'GC=F';
const USDCNY_SYMBOL = 'USDCNY=X';
const TROY_OZ_TO_GRAM = 31.1035;

function yahooFinanceUrl(path: string): string {
  const isDev = import.meta.env.DEV;
  const base = isDev ? '/yahoo-finance' : 'https://query1.finance.yahoo.com';
  return `${base}${path}`;
}

async function fetchMeta(symbol: string): Promise<Record<string, unknown>> {
  const url = yahooFinanceUrl(`/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d&includePrePost=false`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed for ${symbol} (${response.status})`);
  const data = await response.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`No data available for ${symbol}`);
  return meta as Record<string, unknown>;
}

export async function fetchGoldPrice(): Promise<QuoteResult> {
  const [goldMeta, cnyMeta] = await Promise.all([
    fetchMeta(GOLD_SYMBOL),
    fetchMeta(USDCNY_SYMBOL),
  ]);

  const price = Number(goldMeta.regularMarketPrice);
  const previousClose = Number(goldMeta.chartPreviousClose);

  if (!price || !previousClose) throw new Error('Gold price data unavailable');

  const usdCnyRate = Number(cnyMeta.regularMarketPrice) || 0;
  const changePercent = previousClose === 0 ? 0 : ((price - previousClose) / previousClose) * 100;
  const cnyPerGram = usdCnyRate > 0 ? (price * usdCnyRate) / TROY_OZ_TO_GRAM : undefined;

  return {
    symbol: GOLD_SYMBOL,
    shortName: (goldMeta.shortName as string) ?? 'Gold Futures',
    currency: (goldMeta.currency as string) ?? 'USD',
    price,
    previousClose,
    changePercent,
    cnyPerGram,
    updatedAt: new Date(((goldMeta.regularMarketTime as number) ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
  };
}
