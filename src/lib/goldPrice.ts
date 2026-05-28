import type { QuoteResult } from '../types';

const TROY_OZ_TO_GRAM = 31.1035;

export async function fetchGoldPrice(): Promise<QuoteResult> {
  const [metalsRes, fxRes] = await Promise.all([
    fetch('https://api.metals.live/v1/spot'),
    fetch('https://api.frankfurter.app/latest?from=USD&to=CNY'),
  ]);

  if (!metalsRes.ok) throw new Error(`Metals API error (${metalsRes.status})`);
  if (!fxRes.ok) throw new Error(`FX rate API error (${fxRes.status})`);

  const metals = await metalsRes.json();
  const fx = await fxRes.json();

  // metals.live returns [{ gold, silver, ... }]
  const goldUsdPerOz = Number(Array.isArray(metals) ? metals[0]?.gold : metals?.gold);
  if (!goldUsdPerOz) throw new Error('Gold price data unavailable');

  const usdCnyRate = Number(fx?.rates?.CNY) || 0;
  const cnyPerGram = usdCnyRate > 0 ? (goldUsdPerOz * usdCnyRate) / TROY_OZ_TO_GRAM : undefined;

  return {
    symbol: 'XAU',
    shortName: 'Gold Spot',
    currency: 'USD',
    price: goldUsdPerOz,
    previousClose: goldUsdPerOz, // spot API doesn't provide prev close
    changePercent: 0,
    cnyPerGram,
    updatedAt: new Date().toISOString(),
  };
}
