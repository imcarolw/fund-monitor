import type { QuoteResult } from '../types';

const TROY_OZ_TO_GRAM = 31.1035;

export async function fetchGoldPrice(): Promise<QuoteResult> {
  const res = await fetch('/api/gold-price');
  if (!res.ok) throw new Error(`Gold price request failed (${res.status})`);

  const { goldUsdPerOz, usdCny, error } = await res.json();
  if (error) throw new Error(error);
  if (!goldUsdPerOz) throw new Error('Gold price data unavailable');

  const cnyPerGram = usdCny > 0 ? (goldUsdPerOz * usdCny) / TROY_OZ_TO_GRAM : undefined;

  return {
    symbol: 'XAU',
    shortName: 'Gold Spot',
    currency: 'USD',
    price: goldUsdPerOz,
    previousClose: goldUsdPerOz,
    changePercent: 0,
    cnyPerGram,
    updatedAt: new Date().toISOString(),
  };
}
