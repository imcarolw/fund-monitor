const TRACKED_FUNDS_STORAGE_KEY = 'fund-look-through-monitor-direct-funds';

const sampleTrackedFundCodes = ['161725', '481010', '160517'];

export function loadTrackedFundCodes(): string[] {
  try {
    const raw = window.localStorage.getItem(TRACKED_FUNDS_STORAGE_KEY);
    if (!raw) {
      return sampleTrackedFundCodes;
    }

    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : sampleTrackedFundCodes;
  } catch {
    return sampleTrackedFundCodes;
  }
}

export function saveTrackedFundCodes(codes: string[]): void {
  window.localStorage.setItem(TRACKED_FUNDS_STORAGE_KEY, JSON.stringify(codes));
}
