function HolderAvatar({ name, imageUrl }: { name: string; imageUrl?: string }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        className="w-9 h-9 rounded-full object-cover bg-neutral-800 shrink-0"
      />
    );
  }
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center text-[11px] font-medium text-neutral-300 shrink-0">
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

export { HolderAvatar, fmtShares, fmtMoney as fmtCapMoney };
