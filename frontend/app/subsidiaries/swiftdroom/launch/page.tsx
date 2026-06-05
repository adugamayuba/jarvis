"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CopyBlock {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
}

const LAUNCH_BLOCKS: CopyBlock[] = [
  {
    id: "ph-tagline",
    title: "Product Hunt — Tagline",
    subtitle: "60 chars max",
    content: "Autofill job apps on Workday & Greenhouse. You still hit submit.",
  },
  {
    id: "ph-title",
    title: "Product Hunt — Title",
    content: "Swiftdroom — Job Application Co-Pilot",
  },
  {
    id: "ph-desc",
    title: "Product Hunt — Description",
    content: `Swiftdroom is a Chrome extension + dashboard for active job seekers.

Set up your profile once. When you're on a Workday, Greenhouse, or Lever application, Swiftdroom scans the form, autofills your details, drafts AI answers to essay questions from your resume + the job post, and tracks every application — but you always review and submit yourself.

Co-pilot, not autopilot.

• Persona resumes for PM vs eng vs design roles
• Ghostwriter for open-ended questions
• Magical fill with typing animation
• Monthly plans from $9.99

https://swiftdroom.com`,
  },
  {
    id: "ph-maker",
    title: "Product Hunt — Maker comment (first comment)",
    content: `Hey PH 👋 I'm Abel, founder of Swiftdroom.

I built this because I was spending 30+ minutes per application retyping the same resume data and rewriting the same "why this company" essays.

Swiftdroom sits in a Chrome side panel while you apply. It reads the form (including iframes), lets you edit every answer, generates essay drafts from your resume + job description, then fills the page when you're ready. You still click Submit on the employer site.

Would love your feedback — especially if you've fought Workday recently.

Chrome Web Store: [link when live]
Try it: https://swiftdroom.com`,
  },
  {
    id: "hn-title",
    title: "Hacker News — Show HN title",
    content: "Show HN: Swiftdroom – Chrome extension that autofills Workday/Greenhouse job applications",
  },
  {
    id: "hn-post",
    title: "Hacker News — Show HN post",
    content: `Swiftdroom (https://swiftdroom.com) is a job application co-pilot I built after one too many 40-minute Workday forms.

It's a Chrome extension + web dashboard. You set up your profile and persona resumes once. On an application page it:

1. Scans the form (including iframes / shadow DOM)
2. Shows editable answers in a side panel
3. Drafts essay questions with AI (resume + job description + persona)
4. Fills the live form when you click Fill — with a typing animation
5. Counts completed applications toward your plan

It never auto-submits. The user reviews everything and hits Submit on the employer site.

Stack: Next.js, Neon/Postgres, Stripe, OpenAI, Chrome MV3 side panel.

Pricing: $9.99 / $19.99 / $39.99 per month by application volume.

Chrome Web Store listing is pending review. Happy to answer questions about form detection or the Ghostwriter pipeline.`,
  },
  {
    id: "launch-email",
    title: "Launch email — waitlist / early users",
    content: `Subject: Swiftdroom is live on the Chrome Web Store 🚀

Hello

Quick note — Swiftdroom is now available on the Chrome Web Store.

If you're applying to jobs online, you know the drill: same resume typed into Workday over and over, custom essays for every role.

Swiftdroom fixes that. One profile on swiftdroom.com, then on any application page:

• Autofill your details across Workday, Greenhouse, Lever, and more
• AI-drafted answers to essay questions (you edit everything)
• Track applications against your monthly plan

You always review and submit — we're a co-pilot, not autopilot.

Install the extension: [Chrome Web Store link]
Set up your profile: https://swiftdroom.com

Would love to hear what you think.`,
  },
  {
    id: "twitter",
    title: "Twitter / X launch post",
    content: `Job applications shouldn't take 40 minutes.

We built Swiftdroom — a Chrome extension that autofills Workday & Greenhouse forms + drafts essay answers from your resume.

You still hit submit. Co-pilot, not autopilot.

🚀 Live on Chrome Web Store
→ swiftdroom.com`,
  },
  {
    id: "linkedin",
    title: "LinkedIn launch post",
    content: `Excited to share Swiftdroom — a job application co-pilot for anyone applying at volume.

The problem: every online application means retyping your resume, fighting browser autofill, and rewriting the same essay answers. One application can take 20–40 minutes.

Swiftdroom is a Chrome extension + dashboard that:
→ Scans ATS forms (Workday, Greenhouse, Lever)
→ Autofills your profile and persona-specific resume
→ Drafts AI answers to open-ended questions
→ Tracks applications — you always review and submit

We never auto-submit. You stay in control.

Now live on the Chrome Web Store. Try it at swiftdroom.com

If you're a career center, bootcamp, or university — we also offer institutional licenses with an admin dashboard. DM me.`,
  },
  {
    id: "reddit",
    title: "Reddit — r/jobs / r/cscareerquestions (adapt tone)",
    content: `Title: I built a Chrome extension that autofills Workday/Greenhouse applications — feedback welcome

Body:
Got tired of spending 30+ min per application retyping the same info, so I built Swiftdroom.

It's a side panel that scans the form, autofills from your profile, and drafts essay answers using your resume + the job description. You edit everything in the panel, then it fills the page. You still click submit yourself.

Free onboarding at swiftdroom.com, paid plans for the extension + AI usage.

Chrome Web Store link: [when live]

Happy to answer questions or take brutal feedback.`,
  },
];

function CopyCard({ block }: { block: CopyBlock }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(block.content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/20">
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-neutral-800/80">
        <div>
          <p className="text-[13px] font-medium text-neutral-200">{block.title}</p>
          {block.subtitle && (
            <p className="text-[11px] text-neutral-600 mt-0.5">{block.subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={copy}
          className={cn(
            "flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md border transition-colors shrink-0",
            copied
              ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
              : "border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-600"
          )}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="px-4 py-3 text-[12px] text-neutral-400 whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">
        {block.content}
      </pre>
    </div>
  );
}

export default function SwiftdroomLaunchPage() {
  return (
    <div className="p-4 sm:p-8 max-w-3xl h-full overflow-y-auto">
      <Link
        href="/subsidiaries/swiftdroom"
        className="inline-flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Swiftdroom Growth HQ
      </Link>

      <div className="mb-8">
        <p className="text-[11px] font-mono text-neutral-600 uppercase tracking-widest mb-1">Launch Engine</p>
        <h1 className="text-2xl font-semibold text-white">Swiftdroom go-live kit</h1>
        <p className="text-[13px] text-neutral-500 mt-1">
          Copy-paste launch copy for Product Hunt, Hacker News, email, and social. Update Chrome Store link when approved.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <a
          href="https://swiftdroom.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md border border-neutral-700 text-neutral-400 hover:text-white transition-colors"
        >
          swiftdroom.com <ExternalLink className="w-3 h-3" />
        </a>
        <a
          href="https://swiftdroom.com/admin"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md border border-neutral-700 text-neutral-400 hover:text-white transition-colors"
        >
          Admin dashboard <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="space-y-4">
        {LAUNCH_BLOCKS.map(block => (
          <CopyCard key={block.id} block={block} />
        ))}
      </div>

      <div className="mt-8 border border-neutral-800 rounded-lg p-4 bg-neutral-900/30">
        <p className="text-[12px] font-medium text-neutral-300 mb-2">Launch checklist</p>
        <ul className="text-[12px] text-neutral-500 space-y-1.5 list-disc list-inside">
          <li>Chrome Web Store approved → swap [link] in all copy</li>
          <li>Product Hunt — schedule for Tuesday–Thursday 12:01 AM PT</li>
          <li>Hacker News Show HN — post after PH or same day morning</li>
          <li>Email waitlist + LinkedIn/Twitter/Reddit same day</li>
          <li>Gmail extension → Swiftdroom Users template for warm outreach</li>
        </ul>
      </div>
    </div>
  );
}
