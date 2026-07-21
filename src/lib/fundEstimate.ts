import type { FundEstimate } from '../types';

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
// settled NAV and its change. This endpoint covers every fund type.
async function fetchLastNav(code: string): Promise<FundEstimate | null> {
  const url =
    `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo` +
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

  const estimate = (await fetchLiveEstimate(normalized)) ?? (await fetchLastNav(normalized));

  if (!estimate) {
    throw new Error(`Failed to load fund estimate for ${normalized}`);
  }

  return estimate;
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