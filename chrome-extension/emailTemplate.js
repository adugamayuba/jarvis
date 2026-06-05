// Reelin AI investor outreach email — hardcoded template for Gmail send mode
(function () {
  const SUBJECT = "The First Autonomous AI Social Network - Seed";
  const CC = "ligia@reelin.ai";

  const BODY_PLAIN = `Hello

Hope you're doing well. I'm Abel Adugam, founder of Reelin AI.

We built an autonomous AI social network. Users fork their identity to get an AI twin that lives, posts, and interacts on its own. The Sims meets social, but your twin runs the feed for you.

A few quick notes:

• Mark Cuban — existing investor
• Live on Apple App Store and Google Play
• Patent pending on Identity Fork architecture
• Raising a $10M seed round

Deck: https://docsend.com/view/raru36axy8gftwb4
Vision (2 min): https://www.youtube.com/watch?v=VXyHM9MrmuU

I'd love to schedule a short call to walk you through a live demo and discuss the round. What does your calendar look like this week or next?

Looking forward to hearing from you.`;

  function buildPlain(firstName) {
    const hello = firstName ? `Hello ${firstName},` : "Hello,";
    return BODY_PLAIN.replace(/^Hello\n\n/, `${hello}\n\n`);
  }

  window.__jarvisEmailTemplate = {
    subject: SUBJECT,
    cc: CC,
    bodyPlain: BODY_PLAIN,
    plainTextOnly: true,
    buildPlain,
  };

  // TechCrunch / press outreach — plain text only (better deliverability, Gmail signature adds closing)
  const JOURNALIST_SUBJECT = "Reelin AI pre-seed — Shark Tank investor, one week after launch";
  const JOURNALIST_BODY = `Hello

Hope you're doing well.

I'm Abel Adugam, founder of Reelin AI. I'm reaching out with an exclusive I'd love to offer you before we announce publicly.

The headline: we closed a pre-seed round one week after founding, backed by a prominent Shark Tank investor.

What we built: the world's first autonomous AI social network. Users fork their identity to create an AI twin that lives, posts, and interacts on its own no manual posting, no puppet strings.

A few details that may be useful for your piece:

• Backed by a Shark Tank investor within the first week of the company
• Live on the Apple App Store and Google Play
• Patent pending on our Identity Fork architecture
• Product angle: The Sims meets social but your twin runs the feed for you

I'm happy to share more under embargo, including the full funding story, product demo, and founder background. A quick call works great on my end.

Looking forward to hearing from you.`;

  function buildJournalistPlain(firstName) {
    const hello = firstName ? `Hello ${firstName},` : "Hello,";
    return JOURNALIST_BODY.replace(/^Hello\n\n/, `${hello}\n\n`);
  }

  window.__jarvisJournalistTemplate = {
    subject: JOURNALIST_SUBJECT,
    cc: "",
    bodyPlain: JOURNALIST_BODY,
    plainTextOnly: true,
    buildPlain: buildJournalistPlain,
  };

  // Swiftdroom B2C — job seekers / consumers
  const SWIFTDROOM_B2C_SUBJECT = "Apply to jobs in half the time — Swiftdroom";
  const SWIFTDROOM_B2C_BODY = `Hello

Hope you're doing well. I'm Abel, founder of Swiftdroom.

If you're applying to jobs online, you know the pain — retyping your resume on every Workday and Greenhouse form, writing custom essay answers again and again. One application can take 20 to 40 minutes.

Swiftdroom is a Chrome extension and dashboard that:

• Scans application forms (Workday, Greenhouse, Lever, and more)
• Autofills your profile and persona-specific resume
• Drafts AI answers to essay questions from your resume and the job post
• Tracks every application — you always review and hit submit yourself

Co-pilot, not autopilot.

Try it at https://swiftdroom.com — the Chrome extension is on the Web Store (or pending approval).

Would love to hear what you think, or walk you through a quick demo if helpful.

Looking forward to hearing from you.`;

  function buildSwiftdroomB2CPlain(firstName) {
    const hello = firstName ? `Hello ${firstName},` : "Hello,";
    return SWIFTDROOM_B2C_BODY.replace(/^Hello\n\n/, `${hello}\n\n`);
  }

  window.__jarvisSwiftdroomB2CTemplate = {
    subject: SWIFTDROOM_B2C_SUBJECT,
    cc: "",
    bodyPlain: SWIFTDROOM_B2C_BODY,
    plainTextOnly: true,
    buildPlain: buildSwiftdroomB2CPlain,
  };

  // Swiftdroom B2B — bootcamps, universities, career centers, outplacement
  const SWIFTDROOM_B2B_SUBJECT = "Career placement infrastructure for your students";
  const SWIFTDROOM_B2B_BODY = `Hello

Hope you're doing well. I'm Abel Adugam, founder of Swiftdroom.

I'm reaching out because career centers, coding bootcamps, and outplacement teams share one operational goal: get people hired faster.

We position Swiftdroom not as a browser extension, but as career placement infrastructure for your institution.

What your students get:
• Autofill on Workday, Greenhouse, Lever, and other ATS forms
• AI-drafted essay answers from their resume and the job description
• Persona resumes for different role types (PM, eng, design, etc.)
• They always review and submit — co-pilot, not autopilot

What your team gets — a dedicated admin dashboard:
• Aggregate analytics: total applications sent across your cohort
• Role types and job descriptions hitting the system
• Usage across licensed seats

Institutional pricing: flat monthly retainer by volume (e.g. $2,500/month for up to 500 active student seats).

The math: a handful of institutional partners at that tier builds a strong, predictable B2B revenue pillar — and measurably improves placement outcomes for your students.

I'd love a 20-minute call to show the admin dashboard and student experience, and explore a pilot for your program.

Looking forward to hearing from you.`;

  function buildSwiftdroomB2BPlain(firstName) {
    const hello = firstName ? `Hello ${firstName},` : "Hello,";
    return SWIFTDROOM_B2B_BODY.replace(/^Hello\n\n/, `${hello}\n\n`);
  }

  window.__jarvisSwiftdroomB2BTemplate = {
    subject: SWIFTDROOM_B2B_SUBJECT,
    cc: "",
    bodyPlain: SWIFTDROOM_B2B_BODY,
    plainTextOnly: true,
    buildPlain: buildSwiftdroomB2BPlain,
  };
})();
