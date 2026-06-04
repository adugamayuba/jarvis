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
})();
