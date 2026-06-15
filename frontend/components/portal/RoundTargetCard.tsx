import { fmtCapMoney } from "./CapTableDisplay";
import { p } from "./portalTheme";
import { ROUND_TARGET } from "@/lib/capTableStats";

export function RoundTargetCard({
  roundCommitmentsUsd,
  pipelineUsd,
}: {
  roundCommitmentsUsd: number;
  pipelineUsd: number;
}) {
  const progressPct = Math.min(100, (roundCommitmentsUsd / ROUND_TARGET.raiseUsd) * 100);

  return (
    <section className={`${p.card} overflow-hidden`}>
      <div className="p-5 sm:p-7 border-b border-slate-100">
        <p className={p.statLabel}>Current seed round</p>
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 mt-2 tracking-tight">
          Raising {fmtCapMoney(ROUND_TARGET.raiseUsd)}
        </h2>
        <p className="text-[15px] sm:text-base text-slate-600 mt-2">
          Post-money valuation of {fmtCapMoney(ROUND_TARGET.postMoneyValuationUsd)} USD
        </p>

        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Round commitments (closed)
              </p>
              <p className="text-xl font-semibold text-slate-900 mt-1 tabular-nums">
                {fmtCapMoney(roundCommitmentsUsd)}
                <span className="text-slate-400 font-normal text-base ml-1">
                  / {fmtCapMoney(ROUND_TARGET.raiseUsd)}
                </span>
              </p>
            </div>
            {pipelineUsd > 0 && (
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sky-600">
                  In discussion
                </p>
                <p className="text-lg font-semibold text-sky-800 mt-1 tabular-nums">
                  {fmtCapMoney(pipelineUsd)}
                </p>
              </div>
            )}
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-900 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-sm text-slate-500">
            Closed commitments from Mark Cuban ($100K) and Chris Mullaly ($10K). Pipeline
            allocations are shown separately and not included until terms close.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
        <div className="p-5 sm:p-7">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
            12–24 month targets
          </h3>
          <ul className="mt-4 space-y-3">
            {ROUND_TARGET.milestones.map(item => (
              <li key={item} className="flex gap-3 text-[15px] text-slate-700 leading-relaxed">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-900 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-5 sm:p-7">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
            Use of funds
          </h3>
          <div className="mt-4 space-y-3">
            {ROUND_TARGET.useOfFunds.map(({ label, pct, color }) => (
              <div key={label}>
                <div className="flex justify-between gap-3 text-sm mb-1.5">
                  <span className="text-slate-700">{label}</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
