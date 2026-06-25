export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="[color-scheme:light] min-h-screen">
      {children}
    </div>
  );
}
