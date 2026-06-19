import type { Metadata } from "next";
import { ProductRoadmapPage } from "@/components/product-roadmap/ProductRoadmapPage";

export const metadata: Metadata = {
  title: "Reelin AI · Product Roadmap",
  description: "12-month technical and product roadmap — July 2026 to July 2027. Scaling to 500K users and $1.5M MRR.",
  icons: {
    icon: [{ url: "/reelin-logo.png", type: "image/png" }],
    apple: [{ url: "/reelin-logo.png", type: "image/png" }],
  },
};

export default function Page() {
  return <ProductRoadmapPage />;
}
