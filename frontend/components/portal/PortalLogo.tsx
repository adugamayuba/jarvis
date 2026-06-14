export function PortalLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const title =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  const sub = size === "lg" ? "text-base" : "text-sm";

  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
        <span className="text-white font-semibold text-sm tracking-tight">R</span>
      </div>
      <div>
        <p className={`${title} font-semibold text-slate-900 tracking-tight leading-none`}>
          Reelin AI
        </p>
        <p className={`${sub} text-slate-500 mt-1 font-medium`}>Investor Portal</p>
      </div>
    </div>
  );
}
