import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reelin AI · Investor Portal",
  description: "Secure investor portal for Reelin AI cap table, SAFE documents, and data room.",
  icons: { icon: "/reelin-logo.png", apple: "/reelin-logo.png" },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-light [color-scheme:light] min-h-screen bg-[#f7f8fa] text-slate-900">
      {children}
    </div>
  );
}
