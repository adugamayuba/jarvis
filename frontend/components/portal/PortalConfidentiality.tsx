import { PortalLogo } from "./PortalLogo";

export function PortalConfidentiality({ variant = "full" }: { variant?: "full" | "compact" }) {
  if (variant === "compact") {
    return (
      <div className="mt-10 pt-8 border-t border-slate-200">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Confidentiality notice
        </p>
        <p className="text-sm text-slate-500 leading-relaxed">
          This portal contains confidential and proprietary information belonging to Reelin AI, Inc.
          Access is restricted to authorized investors and their representatives. By signing in, you
          agree to maintain strict confidentiality and not to disclose, reproduce, or distribute any
          materials without prior written consent from Reelin AI.
        </p>
      </div>
    );
  }

  return (
    <footer className="border-t border-slate-200 bg-white mt-16">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-12 sm:py-14">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8 mb-10 pb-10 border-b border-slate-100">
          <PortalLogo size="sm" />
          <p className="text-sm text-slate-400 font-medium">investors.reelin.ai</p>
        </div>

        <div className="space-y-5 max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Confidentiality and restricted access
          </p>

          <p className="text-[15px] text-slate-600 leading-[1.75]">
            This investor portal and all materials contained herein, including but not limited to
            financial summaries, cap table data, SAFE agreements, pitch materials, product
            roadmaps, and data room documents, constitute confidential and proprietary information
            of Reelin AI, Inc. and its affiliates. Access is granted solely to individuals and
            entities explicitly authorized by Reelin AI management.
          </p>

          <p className="text-[15px] text-slate-600 leading-[1.75]">
            By accessing this portal, you acknowledge that you are bound by strict confidentiality
            obligations. You agree not to disclose, publish, transmit, or otherwise make available
            any information obtained through this portal to any third party without the prior
            written approval of Reelin AI. This obligation survives termination of your access and
            applies to all notes, summaries, and derivative materials you may prepare.
          </p>

          <p className="text-[15px] text-slate-600 leading-[1.75]">
            The information presented in this portal is provided for due diligence and relationship
            management purposes only. It does not constitute an offer to sell or a solicitation of
            an offer to buy any securities. Any investment in Reelin AI is subject to definitive
            legal documentation, including executed SAFE agreements or subscription documents, and
            is available only to accredited investors or qualified purchasers as defined under
            applicable securities laws.
          </p>

          <p className="text-[15px] text-slate-600 leading-[1.75]">
            Cap table figures, ownership percentages, and share counts reflect the company's
            current records as of the date displayed and may be updated as new investments close,
            convertible instruments convert, or equity grants are issued. Figures marked as in
            negotiation or in progress are non-binding and subject to change until formal
            documentation is executed by all parties.
          </p>

          <p className="text-[15px] text-slate-600 leading-[1.75]">
            Reelin AI makes no representation or warranty, express or implied, regarding the
            accuracy or completeness of any information in this portal. Forward-looking statements,
            projections, and growth targets are based on management's current expectations and
            involve risks and uncertainties that could cause actual results to differ materially.
            You should conduct your own independent analysis before making any investment decision.
          </p>

          <p className="text-[15px] text-slate-600 leading-[1.75]">
            Unauthorized access, scraping, automated extraction, or attempted circumvention of
            portal security controls is strictly prohibited and may result in immediate termination
            of access and pursuit of all available legal remedies. If you believe you have received
            access credentials in error, please contact{" "}
            <a href="mailto:abel@reelin.ai" className="text-slate-800 underline underline-offset-2 hover:text-slate-950">
              abel@reelin.ai
            </a>{" "}
            and refrain from viewing or downloading any materials.
          </p>

          <p className="text-[15px] text-slate-600 leading-[1.75]">
            All content, trademarks, and intellectual property displayed in this portal remain the
            exclusive property of Reelin AI, Inc. Nothing herein grants any license or rights beyond
            the limited purpose of evaluating a potential or existing investment relationship.
          </p>
        </div>

        <p className="text-sm text-slate-400 mt-10 pt-6 border-t border-slate-100">
          © {new Date().getFullYear()} Reelin AI, Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
