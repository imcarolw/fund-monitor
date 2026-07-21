// Computes a real-time intraday estimate for open-end funds (which no longer
// publish a platform estimate) by combining the fund's disclosed top-10 stock
// holdings with live stock quotes.
//
// Data sources (both reachable on networks that block eastmoney.com and send
// permissive CORS headers):
//   - Holdings: fundmobapi.tiantianfunds.com (mirror of the Eastmoney API)
//   - Live quotes: qt.gtimg.cn (Tencent)
//
// Accuracy note: only the top-10 holdings are public and they are disclosed
// quarterly, so this is an approximation. The caller surfaces the coverage
// percentage so the estimate can be judged accordingly.

type RawHolding = {
  GPDM?: string; // stock code
  GPJC?: string; // stock short name
  JZBL?: string; // weight as a percentage of the fund NAV
  TEXCH?: string; // 1 = Shanghai, 2 = Shenzhen
};

type HoldingsPayload = {
  Datas?: {
    fundStocks?: RawHolding[] | null;
  } | null;
  Expansion?: unknown;
};

export type FundHoldings = {
  asOf: string;
  stocks: { code: string; symbol: string; weight: number }[];
};

export type ComputedEstimate = {
  changePercent: number;
  coverage: number; // total NAV weight of holdings that were successfully priced
  asOf: string;
};

// Holdings only change when the fund reports (quarterly), so cache per session.
const holdingsCache = new Map<string, FundHoldings>();

// Below this NAV coverage the top-10 holdings are too small a slice of the fund
// to extrapolate from, so no approximate estimate is offered.
const MIN_COVERAGE = 20;

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok ? response : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

// Maps an A-share stock code to the symbol format expected by qt.gtimg.cn.
function tencentSymbol(code: string, exchange?: string): string | null {
  if (exchange === '1') return `sh${code}`;
  if (exchange === '2') return `sz${code}`;
  if (/^\d{6}$/.test(code)) return /^[56]/.test(code) ? `sh${code}` : `sz${code}`;
  return null;
}

export async function fetchHoldings(fundCode: string): Promise<FundHoldings | null> {
  const cached = holdingsCache.get(fundCode);
  if (cached) {
    return cached;
  }

  const url =
    `https://fundmobapi.tiantianfunds.com/FundMNewApi/FundMNInverstPosition` +
    `?product=EFund&plat=Iphone&deviceid=web&version=6.4.0&FCODE=${fundCode}&rt=${Date.now()}`;
  const response = await fetchWithTimeout(url);
  if (!response) {
    return null;
  }

  let payload: HoldingsPayload;
  try {
    payload = (await response.json()) as HoldingsPayload;
  } catch {
    return null;
  }

  const rawStocks = payload?.Datas?.fundStocks ?? [];
  const stocks: FundHoldings['stocks'] = [];
  for (const raw of rawStocks) {
    const code = raw.GPDM?.trim();
    const weight = Number(raw.JZBL);
    if (!code || !Number.isFinite(weight) || weight <= 0) {
      continue;
    }
    const symbol = tencentSymbol(code, raw.TEXCH?.trim());
    if (!symbol) {
      continue;
    }
    stocks.push({ code, symbol, weight });
  }

  if (stocks.length === 0) {
    return null;
  }

  const expansion = payload?.Expansion;
  const asOf = typeof expansion === 'string' ? expansion : '';
  const holdings: FundHoldings = { asOf, stocks };
  holdingsCache.set(fundCode, holdings);
  return holdings;
}

// Fetches today's percentage change for each stock symbol. The response is
// GBK-encoded, but only the numeric fields are needed (they are ASCII), so a
// default text decode is fine. Change is derived from the current price and the
// previous close so it is independent of field-index differences across markets.
async function fetchQuoteChanges(symbols: string[]): Promise<Map<string, number>> {
  const changes = new Map<string, number>();
  if (symbols.length === 0) {
    return changes;
  }

  const url = `https://qt.gtimg.cn/q=${symbols.join(',')}`;
  const response = await fetchWithTimeout(url);
  if (!response) {
    return changes;
  }

  const text = await response.text();
  const pattern = /v_[a-z]+\d+="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const fields = match[1].split('~');
    const code = fields[2];
    const price = Number(fields[3]);
    const prevClose = Number(fields[4]);
    if (!code || !Number.isFinite(price) || !Number.isFinite(prevClose) || prevClose <= 0) {
      continue;
    }
    changes.set(code, ((price - prevClose) / prevClose) * 100);
  }

  return changes;
}

export async function computeEstimate(fundCode: string): Promise<ComputedEstimate | null> {
  const holdings = await fetchHoldings(fundCode);
  if (!holdings) {
    return null;
  }

  const changes = await fetchQuoteChanges(holdings.stocks.map((stock) => stock.symbol));
  if (changes.size === 0) {
    return null;
  }

  let weightedChange = 0;
  let coverage = 0;
  for (const stock of holdings.stocks) {
    const change = changes.get(stock.code);
    if (change == null || !Number.isFinite(change)) {
      continue;
    }
    weightedChange += (stock.weight / 100) * change;
    coverage += stock.weight;
  }

  if (coverage <= 0) {
    return null;
  }

  if (coverage < MIN_COVERAGE) {
    return null;
  }

  // Scale the priced holdings up to the whole fund: treat the covered top-10 as
  // representative of the rest of the portfolio.
  const changePercent = weightedChange / (coverage / 100);
  return { changePercent, coverage, asOf: holdings.asOf };
}
