import { useEffect, useMemo, useState } from 'react';
import { fetchFundEstimates, isFundCode } from './lib/fundEstimate.ts';
import { loadTrackedFundCodes, saveTrackedFundCodes } from './lib/storage';
import type { FundEstimate } from './types';

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function timeLabel(value?: string): string {
  if (!value) {
    return 'Never';
  }

  return new Date(value).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function App() {
  const [trackedFundCodes, setTrackedFundCodes] = useState<string[]>(() => loadTrackedFundCodes());
  const [trackedFundEstimates, setTrackedFundEstimates] = useState<Record<string, FundEstimate>>({});
  const [fundCodeInput, setFundCodeInput] = useState('161725');
  const [lastUpdated, setLastUpdated] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [fundError, setFundError] = useState('');
  const [draggedFundCode, setDraggedFundCode] = useState<string | null>(null);
  const [dragOverFundCode, setDragOverFundCode] = useState<string | null>(null);

  useEffect(() => {
    saveTrackedFundCodes(trackedFundCodes);
  }, [trackedFundCodes]);

  const refreshData = async () => {
    setLoading(true);
    setFundError('');

    const messages: string[] = [];

    try {
      if (trackedFundCodes.length > 0) {
        const { estimates, errors } = await fetchFundEstimates(trackedFundCodes);
        setTrackedFundEstimates(estimates);
        messages.push(...Object.values(errors));
      } else {
        setTrackedFundEstimates({});
      }

      setLastUpdated(new Date().toISOString());
      setFundError(messages.join(' '));
    } catch (refreshError) {
      setFundError(refreshError instanceof Error ? refreshError.message : 'Failed to refresh fund data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshData();
    const timer = window.setInterval(() => {
      void refreshData();
    }, 20000);

    return () => window.clearInterval(timer);
  }, [trackedFundCodes.join('|')]);

  const trackedFundList = useMemo(() => {
    return trackedFundCodes.map((code) => ({
      code,
      estimate: trackedFundEstimates[code] ?? null,
    }));
  }, [trackedFundCodes, trackedFundEstimates]);

  const summary = useMemo(() => {
    let rising = 0;
    let falling = 0;

    for (const { estimate } of trackedFundList) {
      if (!estimate) {
        continue;
      }

      if (estimate.estimatedChangePercent >= 0) {
        rising += 1;
      } else {
        falling += 1;
      }
    }

    return { total: trackedFundCodes.length, rising, falling };
  }, [trackedFundCodes.length, trackedFundList]);

  const addTrackedFund = () => {
    const code = fundCodeInput.trim();
    setFundError('');

    if (!isFundCode(code)) {
      setFundError('Fund code must be 6 digits.');
      return;
    }

    if (trackedFundCodes.includes(code)) {
      setFundError(`Fund ${code} is already being tracked.`);
      return;
    }

    setTrackedFundCodes((current) => [code, ...current]);
    setFundCodeInput('');
  };

  const removeTrackedFund = (code: string) => {
    setTrackedFundCodes((current) => current.filter((item) => item !== code));
    setTrackedFundEstimates((current) => {
      const next = { ...current };
      delete next[code];
      return next;
    });
  };

  const reorderTrackedFund = (sourceCode: string, targetCode: string) => {
    if (sourceCode === targetCode) {
      return;
    }

    setTrackedFundCodes((current) => {
      const sourceIndex = current.indexOf(sourceCode);
      const targetIndex = current.indexOf(targetCode);

      if (sourceIndex === -1 || targetIndex === -1) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  };

  return (
    <main className="app-shell">
      <section className="hero card">
        <div>
          <p className="eyebrow">Real-time fund monitor</p>
          <h1>Track your fund IDs in one clean list</h1>
          <p className="subtle">
            Add the 6-digit fund IDs you care about and the app will keep refreshing their estimated
            intraday up/down rates automatically.
          </p>
        </div>
        <div className="hero-actions">
          <button className="primary" onClick={() => void refreshData()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh now'}
          </button>
          <span className="timestamp">Updated {timeLabel(lastUpdated)}</span>
        </div>
      </section>

      <section className="summary-grid">
        <article className="card stat-card">
          <span className="label">Tracked funds</span>
          <strong>{summary.total}</strong>
        </article>
        <article className="card stat-card">
          <span className="label">Rising now</span>
          <strong className="up">{summary.rising}</strong>
        </article>
        <article className="card stat-card">
          <span className="label">Falling now</span>
          <strong className="down">{summary.falling}</strong>
        </article>
      </section>

      {fundError ? <section className="card error-banner">{fundError}</section> : null}

      <section className="layout-grid">
        <section className="card form-card">
          <div className="section-title">
            <h2>Track fund codes</h2>
            <p>Examples: 161725, 481010, 160517</p>
          </div>

          <label>
            Fund code
            <input value={fundCodeInput} onChange={(event) => setFundCodeInput(event.target.value)} placeholder="161725" />
          </label>

          <button className="primary" type="button" onClick={addTrackedFund}>
            Add fund code
          </button>
        </section>

        <section className="fund-list">
          <article className="card fund-card">
            <div className="fund-header">
              <div>
                <h2>Auto-monitored funds</h2>
                <p className="subtle">Refreshing every 20 seconds while the app is open.</p>
              </div>
            </div>

            {trackedFundList.length === 0 ? (
              <p className="subtle">No direct fund codes yet. Add one on the left.</p>
            ) : (
              <div className="tracked-funds-table">
                <div className="tracked-funds-head tracked-fund-row">
                  <span>Code</span>
                  <span>Name</span>
                  <span>Change</span>
                  <span>Est. NAV</span>
                  <span>Last NAV</span>
                  <span>Time</span>
                  <span>Action</span>
                </div>
                {trackedFundList.map(({ code, estimate }) => (
                  <article
                    key={code}
                    className={`tracked-fund-row ${draggedFundCode === code ? 'dragged-row' : ''} ${dragOverFundCode === code ? 'drag-over-row' : ''}`.trim()}
                    draggable
                    onDragStart={(event) => {
                      setDraggedFundCode(code);
                      setDragOverFundCode(code);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', code);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      if (dragOverFundCode !== code) {
                        setDragOverFundCode(code);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceCode = event.dataTransfer.getData('text/plain') || draggedFundCode;
                      if (sourceCode) {
                        reorderTrackedFund(sourceCode, code);
                      }
                      setDraggedFundCode(null);
                      setDragOverFundCode(null);
                    }}
                    onDragEnd={() => {
                      setDraggedFundCode(null);
                      setDragOverFundCode(null);
                    }}
                    title="Drag to reorder"
                  >
                    <strong className="fund-code-cell">{code}</strong>
                    <span className="fund-name-cell" title={estimate?.name ?? code}>
                      {estimate?.name ?? 'Waiting for estimate…'}
                    </span>
                    <strong className={estimate ? (estimate.estimatedChangePercent >= 0 ? 'up' : 'down') : ''}>
                      {estimate ? formatPercent(estimate.estimatedChangePercent) : '--'}
                    </strong>
                    <span>{estimate ? estimate.estimatedNav.toFixed(4) : '--'}</span>
                    <span>{estimate ? estimate.lastNav.toFixed(4) : '--'}</span>
                    <span>{estimate?.estimateTime || '--'}</span>
                    <div className="row-actions">
                      <button className="ghost compact-button" type="button" onClick={() => removeTrackedFund(code)}>
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}
