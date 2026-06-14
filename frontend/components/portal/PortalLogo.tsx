import Image from "next/image";

const SIZES = {
  sm: { icon: 36, title: "text-base", sub: "text-sm" },
  md: { icon: 40, title: "text-lg", sub: "text-sm" },
  lg: { icon: 52, title: "text-2xl", sub: "text-base" },
} as const;

export function PortalLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = SIZES[size];

  return (
    <div className="flex items-center gap-3">
      <Image
        src="/reelin-logo.png"
        alt="Reelin AI"
        width={s.icon}
        height={s.icon}
        className="rounded-lg shrink-0"
        priority
      />
      <div>
        <p className={`${s.title} font-semibold text-slate-900 tracking-tight leading-none`}>
          Reelin AI
        </p>
        <p className={`${s.sub} text-slate-500 mt-1 font-medium`}>Investor Portal</p>
      </div>
    </div>
  );
}
