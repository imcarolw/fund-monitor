import type { QuoteResult } from '../types';

const TROY_OZ_TO_GRAM = 31.1035;
const API_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.min.json';

export async function fetchGoldPrice(): Promise<QuoteResult> {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`Gold price request failed (${res.status})`);

  const data = await res.json();
  const goldUsdPerOz = Number(data?.xau?.usd);
  const goldCnyPerOz = Number(data?.xau?.cny);

  if (!goldUsdPerOz) throw new Error('Gold price data unavailable');

  const cnyPerGram = goldCnyPerOz > 0 ? goldCnyPerOz / TROY_OZ_TO_GRAM : undefined;

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
