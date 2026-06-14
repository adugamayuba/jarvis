/** Shared light-theme tokens for the investor portal */
export const p = {
  shell: "min-h-screen bg-[#f7f8fa] text-slate-900 font-[family-name:var(--font-geist-sans)]",
  header: "bg-white border-b border-slate-200/80 shadow-[0_1px_0_rgba(15,23,42,0.04)] sticky top-0 z-20",
  main: "max-w-6xl mx-auto px-6 sm:px-8 py-8 sm:py-10",
  h1: "text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight text-slate-900",
  subtitle: "text-base text-slate-500 mt-1.5",
  card: "bg-white border border-slate-200/90 rounded-xl shadow-sm",
  cardPad: "p-6 sm:p-7",
  statLabel: "text-xs font-semibold uppercase tracking-[0.08em] text-slate-500",
  statValue: "text-2xl font-semibold text-slate-900 mt-2 tabular-nums",
  tableWrap: "bg-white border border-slate-200/90 rounded-xl shadow-sm overflow-hidden",
  th: "text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50/80 border-b border-slate-200",
  td: "px-5 py-4 text-[15px] text-slate-700 border-b border-slate-100",
  btnPrimary:
    "inline-flex items-center justify-center h-11 px-5 rounded-lg bg-slate-900 text-white text-[15px] font-medium hover:bg-slate-800 transition-colors disabled:opacity-50",
  btnSecondary:
    "inline-flex items-center justify-center h-11 px-5 rounded-lg border border-slate-300 bg-white text-slate-800 text-[15px] font-medium hover:bg-slate-50 transition-colors",
  input:
    "w-full h-11 px-3.5 rounded-lg border border-slate-300 bg-white text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400",
  navActive: "text-slate-900 border-b-2 border-slate-900 pb-3 -mb-px",
  navIdle: "text-slate-500 hover:text-slate-800 pb-3 -mb-px border-b-2 border-transparent",
  muted: "text-[15px] text-slate-500",
  error: "text-[15px] text-red-600",
} as const;
