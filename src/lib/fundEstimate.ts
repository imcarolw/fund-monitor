import type { FundEstimate } from '../types';
import { computeEstimate } from './fundHoldings';

function currentTimeLabel(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}`
  );
}

type ValuationExpansion = {
  FCODE?: string;
  SHORTNAME?: string;
  GZTIME?: string;
  GZ?: string;
  GSZZL?: string;
  JZRQ?: string;
  DWJZ?: string;
};

type FundBaseInfo = {
  FCODE?: string;
  SHORTNAME?: string;
  NAV?: string;
  NAVCHGRT?: string;
  PDATE?: string;
  GSZ?: string | null;
  GSZZL?: string | null;
  GZTIME?: string | null;
};

function normalizeFundCode(input: string): string {
  return input.trim();
}

export function isFundCode(value: string): boolean {
  return /^\d{6}$/.test(normalizeFundCode(value));
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

// On-exchange funds (ETF/LOF) still publish a live intraday valuation.
async function fetchLiveEstimate(code: string): Promise<FundEstimate | null> {
  const url =
    `https://fundcomapi.tiantianfunds.com/mm/newCore/FundVarietieValuationDetail` +
    `?FCODE=${code}&deviceid=web&plat=Iphone&product=EFund&version=6.4.0&rt=${Date.now()}`;
  const outer = (await fetchJson(url)) as { data?: string } | null;

  if (!outer?.data) {
    return null;
  }

  let expansion: ValuationExpansion | undefined;
  try {
    const inner = JSON.parse(outer.data) as { Expansion?: ValuationExpansion };
    expansion = inner?.Expansion ?? undefined;
  } catch {
    return null;
  }

  if (!expansion?.FCODE || expansion.GSZZL == null || expansion.GZ == null || expansion.DWJZ == null) {
    return null;
  }

  return {
    fundCode: expansion.FCODE,
    name: expansion.SHORTNAME ?? code,
    navDate: expansion.JZRQ ?? '',
    lastNav: Number(expansion.DWJZ),
    estimatedNav: Number(expansion.GZ),
    estimatedChangePercent: Number(expansion.GSZZL),
    estimateTime: expansion.GZTIME ?? '',
    live: true,
  };
}

// Open-end funds no longer publish intraday estimates, so fall back to the last
// settled NAV and its change. This endpoint covers every fund type. The
// tiantianfunds host is used (mirrors fundmobapi.eastmoney.com) because some
// networks block the eastmoney.com domain.
async function fetchLastNav(code: string): Promise<FundEstimate | null> {
  const url =
    `https://fundmobapi.tiantianfunds.com/FundMNewApi/FundMNFInfo` +
    `?product=EFund&plat=Iphone&deviceid=web&version=6.4.0&Fcodes=${code}` +
    `&Fields=FCODE,SHORTNAME,NAV,NAVCHGRT,PDATE,GSZ,GSZZL,GZTIME&rt=${Date.now()}`;
  const payload = (await fetchJson(url)) as { Datas?: FundBaseInfo[] } | null;
  const info = payload?.Datas?.[0];

  if (!info?.FCODE || info.NAV == null) {
    return null;
  }

  // If a live estimate happens to be present here, prefer it.
  const hasEstimate = info.GSZ != null && info.GSZZL != null;
  const lastNav = Number(info.NAV);

  return {
    fundCode: info.FCODE,
    name: info.SHORTNAME ?? code,
    navDate: info.PDATE ?? '',
    lastNav,
    estimatedNav: hasEstimate ? Number(info.GSZ) : lastNav,
    estimatedChangePercent: hasEstimate ? Number(info.GSZZL) : Number(info.NAVCHGRT ?? 0),
    estimateTime: (hasEstimate ? info.GZTIME : info.PDATE) ?? '',
    live: hasEstimate,
  };
}

export async function fetchFundEstimate(fundCode: string): Promise<FundEstimate> {
  const normalized = normalizeFundCode(fundCode);

  if (!isFundCode(normalized)) {
    throw new Error('Fund code must be 6 digits.');
  }

  // 1. On-exchange funds (ETF/LOF) publish a precise live valuation.
  const live = await fetchLiveEstimate(normalized);
  if (live) {
    return live;
  }

  // 2. Everything else falls back to the last settled NAV.
  const base = await fetchLastNav(normalized);
  if (!base) {
    throw new Error(`Failed to load fund estimate for ${normalized}`);
  }

  // 3. If the platform already had an intraday estimate, keep it.
  if (base.live) {
    return base;
  }

  // 4. Otherwise compute a real-time approximation from the fund's top-10
  //    holdings and live stock quotes.
  const computed = await computeEstimate(normalized);
  if (computed) {
    return {
      ...base,
      estimatedChangePercent: computed.changePercent,
      estimatedNav: base.lastNav * (1 + computed.changePercent / 100),
      estimateTime: currentTimeLabel(),
      live: true,
      approx: true,
      coverage: computed.coverage,
    };
  }

  // 5. No intraday data available: show the last settled NAV.
  return base;
}

export async function fetchFundEstimates(fundCodes: string[]): Promise<{
  estimates: Record<string, FundEstimate>;
  errors: Record<string, string>;
}> {
  const estimates: Record<string, FundEstimate> = {};
  const errors: Record<string, string> = {};
  const uniqueCodes = Array.from(new Set(fundCodes.map((code) => normalizeFundCode(code)).filter(Boolean)));

  for (const code of uniqueCodes) {
    try {
      const estimate = await fetchFundEstimate(code);
      estimates[estimate.fundCode] = estimate;
    } catch (error) {
      errors[code] = error instanceof Error ? error.message : `Failed to load fund estimate for ${code}`;
    }
  }

  return { estimates, errors };
}