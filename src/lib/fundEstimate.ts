import type { FundEstimate } from '../types';

declare global {
  interface Window {
    jsonpgz?: (payload: unknown) => void;
  }
}

type RawFundEstimate = {
  fundcode?: string;
  name?: string;
  jzrq?: string;
  dwjz?: string;
  gsz?: string;
  gszzl?: string;
  gztime?: string;
};

function normalizeFundCode(input: string): string {
  return input.trim();
}

export function isFundCode(value: string): boolean {
  return /^\d{6}$/.test(normalizeFundCode(value));
}

export async function fetchFundEstimate(fundCode: string): Promise<FundEstimate> {
  const normalized = normalizeFundCode(fundCode);

  if (!isFundCode(normalized)) {
    throw new Error('Fund code must be 6 digits.');
  }

  return new Promise<FundEstimate>((resolve, reject) => {
    const callbackName = 'jsonpgz';
    const previousCallback = window[callbackName];
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out while loading fund estimate for ${normalized}`));
    }, 8000);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();

      if (previousCallback) {
        window[callbackName] = previousCallback;
      } else {
        delete window[callbackName];
      }
    }

    window[callbackName] = (payload: unknown) => {
      cleanup();

      const data = payload as RawFundEstimate;

      if (!data?.fundcode || !data?.gszzl || !data?.gsz || !data?.dwjz) {
        reject(new Error(`No fund estimate available for ${normalized}`));
        return;
      }

      resolve({
        fundCode: data.fundcode,
        name: data.name ?? normalized,
        navDate: data.jzrq ?? '',
        lastNav: Number(data.dwjz),
        estimatedNav: Number(data.gsz),
        estimatedChangePercent: Number(data.gszzl),
        estimateTime: data.gztime ?? '',
      });
    };

    script.src = `https://fundgz.1234567.com.cn/js/${normalized}.js?rt=${Date.now()}`;
    script.async = true;
    script.onerror = () => {
      cleanup();
      reject(new Error(`Failed to load fund estimate for ${normalized}`));
    };
    document.body.appendChild(script);
  });
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