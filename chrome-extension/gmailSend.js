// Gmail compose automation for Jarvis extension
(function () {
  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function isGmail() {
    return location.hostname === "mail.google.com";
  }

  function findComposeButton() {
    return (
      document.querySelector('[gh="cm"]') ||
      document.querySelector('[data-tooltip="Compose"]') ||
      [...document.querySelectorAll('div[role="button"]')].find((el) => {
        const label = el.getAttribute("aria-label") || el.getAttribute("data-tooltip") || "";
        return label === "Compose" || label.startsWith("Compose");
      })
    );
  }

  function getComposeDialog() {
    const dialogs = [...document.querySelectorAll('[role="dialog"]')];
    for (let i = dialogs.length - 1; i >= 0; i--) {
      const d = dialogs[i];
      if (d.querySelector('input[name="subjectbox"], input[aria-label*="Subject"]')) return d;
    }
    return (
      document.querySelector(".AD") ||
      document.querySelector(".aoI") ||
      document.querySelector('[aria-label="New Message"]')?.closest('[role="dialog"]') ||
      null
    );
  }

  async function waitForCompose(timeoutMs = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const dialog = getComposeDialog();
      if (dialog) return dialog;
      await sleep(200);
    }
    throw new Error("Compose window did not open — click Compose manually first");
  }

  function findInCompose(dialog, selectors) {
    for (const sel of selectors) {
      const el = dialog.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  async function fillRecipient(dialog, email) {
    const toEl =
      findInCompose(dialog, [
        'input[aria-label="To recipients"]',
        'textarea[aria-label="To recipients"]',
        'input[name="to"]',
        'textarea[name="to"]',
        'input[peoplekit-id]',
        ".agP",
        '[aria-label="To"]',
      ]) ||
      dialog.querySelector('[aria-label*="To"]');

    if (!toEl) throw new Error("Could not find To field");

    toEl.focus();
    toEl.click();
    await sleep(150);

    if (toEl.tagName === "INPUT" || toEl.tagName === "TEXTAREA") {
      toEl.value = email;
      toEl.dispatchEvent(new Event("input", { bubbles: true }));
      toEl.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      toEl.textContent = email;
      toEl.dispatchEvent(new InputEvent("input", { bubbles: true }));
    }

    await sleep(200);
    toEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
    toEl.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
    await sleep(400);
  }

  async function fillSubject(dialog, subject) {
    const subjectEl = findInCompose(dialog, [
      'input[name="subjectbox"]',
      'input[aria-label*="Subject"]',
      'input[placeholder*="Subject"]',
    ]);
    if (!subjectEl) throw new Error("Could not find Subject field");

    subjectEl.focus();
    subjectEl.value = subject;
    subjectEl.dispatchEvent(new Event("input", { bubbles: true }));
    subjectEl.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(200);
  }

  async function fillBody(dialog, body) {
    const bodyEl = findInCompose(dialog, [
      'div[aria-label="Message Body"][contenteditable="true"]',
      'div[aria-label*="Message body"][contenteditable="true"]',
      'div[g_editable="true"][contenteditable="true"]',
      ".Am[contenteditable='true']",
      '[role="textbox"][contenteditable="true"]',
    ]);
    if (!bodyEl) throw new Error("Could not find message body");

    bodyEl.focus();
    bodyEl.innerHTML = "";
    const lines = body.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) bodyEl.appendChild(document.createElement("br"));
      bodyEl.appendChild(document.createTextNode(lines[i]));
    }
    bodyEl.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await sleep(300);
  }

  function findSendButton(dialog) {
    return (
      findInCompose(dialog, [
        '[data-tooltip*="Send"]',
        '[aria-label*="Send"][role="button"]',
        'div[role="button"][aria-label^="Send"]',
      ]) ||
      [...dialog.querySelectorAll('div[role="button"]')].find((el) => {
        const t = el.getAttribute("data-tooltip") || el.getAttribute("aria-label") || el.textContent || "";
        return /^Send\b/i.test(t.trim());
      })
    );
  }

  async function clickSend(dialog) {
    const sendBtn = findSendButton(dialog);
    if (!sendBtn) throw new Error("Could not find Send button");
    sendBtn.click();
    await sleep(2000);
  }

  async function openCompose() {
    const existing = getComposeDialog();
    if (existing) return existing;

    const composeBtn = findComposeButton();
    if (!composeBtn) throw new Error("Compose button not found — open Gmail inbox first");
    composeBtn.click();
    return waitForCompose();
  }

  async function sendOneEmail({ to, subject, body }) {
    const dialog = await openCompose();
    await fillRecipient(dialog, to);
    await fillSubject(dialog, subject);
    await fillBody(dialog, body);
    await clickSend(dialog);
    return { success: true };
  }

  window.__jarvisGmail = {
    isGmail,
    sendOneEmail,
    openCompose,
    sleep,
  };
})();
