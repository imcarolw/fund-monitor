import type { QuoteResult } from '../types';

function normalizeCode(input: string): string {
  const value = input.trim().toUpperCase();

  if (/^\d{6}\.(SS|SZ)$/.test(value) || /^\d{4,5}\.HK$/.test(value)) {
    return value;
  }

  if (/^(SH|SZ)\d{6}$/.test(value)) {
    return `${value.slice(2)}.${value.slice(0, 2)}`;
  }

  if (/^HK\d{4,5}$/.test(value)) {
    return `${value.slice(2).padStart(5, '0')}.HK`;
  }

  if (/^\d{6}$/.test(value)) {
    return /^[69]/.test(value) ? `${value}.SS` : `${value}.SZ`;
  }

  if (/^\d{4,5}$/.test(value)) {
    return `${value.padStart(5, '0')}.HK`;
  }

  return value;
}

async function fetchQuote(symbol: string): Promise<QuoteResult> {
  const normalized = normalizeCode(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${normalized}?interval=1m&range=1d&includePrePost=false`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Quote request failed for ${normalized}`);
  }

  const data = await response.json();
  const result = data?.chart?.result?.[0];
  const meta = result?.meta;

  if (!meta?.regularMarketPrice || !meta?.chartPreviousClose) {
    throw new Error(`No quote available for ${normalized}`);
  }

  const price = Number(meta.regularMarketPrice);
  const previousClose = Number(meta.chartPreviousClose);
  const changePercent = previousClose === 0 ? 0 : ((price - previousClose) / previousClose) * 100;

  return {
    symbol: normalized,
    shortName: meta.shortName ?? normalized,
    currency: meta.currency ?? 'CNY',
    price,
    previousClose,
    changePercent,
    updatedAt: new Date((meta.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
  };
}

export async function fetchQuotes(symbols: string[]): Promise<Record<string, QuoteResult>> {
  const uniqueSymbols = Array.from(new Set(symbols.map(normalizeCode)));
  const entries = await Promise.all(
    uniqueSymbols.map(async (symbol) => {
      const quote = await fetchQuote(symbol);
      return [symbol, quote] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export { normalizeCode };
