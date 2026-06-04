// Reelin AI investor outreach email — hardcoded template for Gmail send mode
(function () {
  const SUBJECT = "The First Autonomous AI Social Network - Seed";
  const CC = "ligia@reelin.ai";

  const BODY_PLAIN = `Hello

Hoping you're doing well. My name is Abel Adugam, Founder of Reelin AI.

We built a social network where the user has zero control. Reelin AI creates an autonomous Digital Twin of the user that lives in a shared simulation. Think The Sims meets TikTok but fully autonomous.

Traction & Progress:

Mark Cuban: Existing investor and early backer.

Distribution: Officially Live on the Apple App Store & Google Play.

Patent Pending: On our autonomous Identity Fork architecture.

Team: Ex-Founders & Ex-DTCP ($3B Fund) Finance Director.

We are currently opening a $10M Seed round to vertically integrate our proprietary generative engine and scale our distribution engine to millions of users.

We are reserving an allocation for strategic angels via a roll up vehicle, making it easy for early backers to participate.

I would love to share more about Reelin AI. At your availability, we can schedule a call to discuss more.

Also attaching our deck and vision video below

Pitch Deck Link - https://docsend.com/view/raru36axy8gftwb4

Vision Link - https://www.youtube.com/watch?v=VXyHM9MrmuU&feature=youtu.be

Looking forward to hearing from you.

Best Regards,`;

  function buildHtml(firstName) {
    const hello = firstName ? `Hello ${firstName},` : "Hello,";
    return `${hello}<br><br>\
Hoping you're doing well. My name is Abel Adugam, Founder of <b>Reelin AI</b>.<br><br>\
We built a social network where the user has <b>zero control</b>. Reelin AI creates an <b>autonomous Digital Twin</b> of the user that lives in a shared simulation. Think <b>The Sims meets TikTok</b> but fully autonomous.<br><br>\
<b>Traction &amp; Progress:</b><br><br>\
<b>Mark Cuban:</b> Existing investor and early backer.<br><br>\
<b>Distribution:</b> Officially Live on the <b>Apple App Store &amp; Google Play</b>.<br><br>\
<b>Patent Pending:</b> On our autonomous Identity Fork architecture.<br><br>\
<b>Team:</b> Ex-Founders &amp; Ex-DTCP ($3B Fund) Finance Director.<br><br>\
We are currently opening a <b>$10M Seed</b> round to vertically integrate our proprietary generative engine and scale our distribution engine to millions of users.<br><br>\
We are reserving an allocation for strategic angels via a roll up vehicle, making it easy for early backers to participate.<br><br>\
I would love to share more about Reelin AI. At your availability, we can schedule a call to discuss more.<br><br>\
Also attaching our deck and vision video below<br><br>\
Pitch Deck Link - <a href="https://docsend.com/view/raru36axy8gftwb4">https://docsend.com/view/raru36axy8gftwb4</a><br><br>\
Vision Link - <a href="https://www.youtube.com/watch?v=VXyHM9MrmuU">https://www.youtube.com/watch?v=VXyHM9MrmuU</a><br><br>\
Looking forward to hearing from you.<br><br>\
Best Regards,`;
  }

  function buildPlain(firstName) {
    const hello = firstName ? `Hello ${firstName},` : "Hello,";
    return BODY_PLAIN.replace(/^Hello\s*/i, hello + "\n");
  }

  window.__jarvisEmailTemplate = {
    subject: SUBJECT,
    cc: CC,
    bodyPlain: BODY_PLAIN,
    buildHtml,
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
