function HolderAvatar({ name, imageUrl }: { name: string; imageUrl?: string }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        className="w-10 h-10 rounded-full object-cover bg-slate-100 ring-1 ring-slate-200 shrink-0"
      />
    );
  }
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0">
      {initials}
    </div>
  );
}

function fmtShares(shares?: number, label?: string) {
  if (label?.trim()) return label;
  if (!shares) return "—";
  return shares.toLocaleString();
}

function fmtMoney(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    pending: "bg-amber-50 text-amber-800 ring-amber-200",
    discussing: "bg-sky-50 text-sky-800 ring-sky-200",
  };
  const cls = styles[status] || "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold capitalize ring-1 ring-inset ${cls}`}>
      {status}
    </span>
  );
}

export { HolderAvatar, fmtShares, fmtMoney as fmtCapMoney, StatusBadge };
