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

  async function waitForCompose(timeoutMs = 12000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const dialog = getComposeDialog();
      if (dialog) return dialog;
      await sleep(200);
    }
    throw new Error("Compose window did not open — click Compose manually first");
  }

  function findToField(dialog) {
    const selectors = [
      'input[aria-label="To recipients"]',
      'textarea[aria-label="To recipients"]',
      'input[name="to"]',
      'textarea[name="to"]',
      'input[peoplekit-id]',
      'div[aria-label="To recipients"] [contenteditable="true"]',
      'div[aria-label="To recipients"] input',
      '[aria-label="To recipients"]',
      '[aria-label="To"]',
    ];
    for (const sel of selectors) {
      const el = dialog.querySelector(sel);
      if (el) return el;
    }

    // First combobox/text input in compose header area
    const combobox = dialog.querySelector('[role="combobox"][aria-label*="To"], [role="combobox"][aria-label*="to"]');
    if (combobox) return combobox;

    const editables = [...dialog.querySelectorAll('[contenteditable="true"]')];
    const toEditable = editables.find(el => {
      const label = el.getAttribute("aria-label") || el.closest("[aria-label]")?.getAttribute("aria-label") || "";
      return /to/i.test(label);
    });
    if (toEditable) return toEditable;

    return editables[0] || null;
  }

  async function typeIntoElement(el, text) {
    el.focus();
    el.click();
    await sleep(150);

    if (el.isContentEditable) {
      el.textContent = "";
      el.innerHTML = "";
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, text);
      el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    } else {
      el.value = "";
      for (const char of text) {
        el.value += char;
        el.dispatchEvent(new InputEvent("input", { bubbles: true, data: char, inputType: "insertText" }));
        await sleep(8);
      }
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  async function fillRecipient(dialog, email) {
    const toEl = findToField(dialog);
    if (!toEl) throw new Error("Could not find To field — make sure compose window is open");

    await typeIntoElement(toEl, email);
    await sleep(300);

    // Confirm email chip with Enter then Tab
    for (const key of ["Enter", "Tab"]) {
      toEl.dispatchEvent(new KeyboardEvent("keydown", { key, code: key, keyCode: key === "Enter" ? 13 : 9, bubbles: true, cancelable: true }));
      toEl.dispatchEvent(new KeyboardEvent("keyup", { key, code: key, keyCode: key === "Enter" ? 13 : 9, bubbles: true }));
      await sleep(250);
    }

    await sleep(400);
  }

  function findCcField(dialog) {
    const selectors = [
      'input[aria-label="Cc recipients"]',
      'textarea[aria-label="Cc recipients"]',
      'input[name="cc"]',
      'textarea[name="cc"]',
      '[aria-label="Cc"]',
      'div[aria-label="Cc recipients"] [contenteditable="true"]',
      'div[aria-label="Cc recipients"] input',
    ];
    for (const sel of selectors) {
      const el = dialog.querySelector(sel);
      if (el) return el;
    }
    // Click "Cc" link to reveal field if hidden
    const ccLink = [...dialog.querySelectorAll("span, div")].find(el =>
      el.textContent?.trim() === "Cc" && el.getAttribute("role") !== "button"
    );
    if (ccLink) {
      ccLink.click();
    }
    for (const sel of selectors) {
      const el = dialog.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  async function fillCc(dialog, ccEmail) {
    if (!ccEmail) return;
    let ccEl = findCcField(dialog);
    if (!ccEl) {
      // Try clicking Cc Bcc toggle
      const toggle = dialog.querySelector('[aria-label="Cc Bcc"]') ||
        [...dialog.querySelectorAll("span")].find(s => s.textContent === "Cc");
      toggle?.click();
      await sleep(300);
      ccEl = findCcField(dialog);
    }
    if (!ccEl) {
      console.warn("Jarvis: Cc field not found, skipping CC");
      return;
    }
    await typeIntoElement(ccEl, ccEmail);
    await sleep(200);
    ccEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
    await sleep(300);
  }

  async function fillSubject(dialog, subject) {
    const subjectEl =
      dialog.querySelector('input[name="subjectbox"]') ||
      dialog.querySelector('input[aria-label*="Subject"]') ||
      dialog.querySelector('input[placeholder*="Subject"]');
    if (!subjectEl) throw new Error("Could not find Subject field");

    await typeIntoElement(subjectEl, subject);
    await sleep(200);
  }

  async function fillBody(dialog, body, bodyHtml) {
    const bodyEl =
      dialog.querySelector('div[aria-label="Message Body"][contenteditable="true"]') ||
      dialog.querySelector('div[aria-label*="Message body"][contenteditable="true"]') ||
      dialog.querySelector('div[g_editable="true"][contenteditable="true"]') ||
      dialog.querySelector(".Am[contenteditable='true']") ||
      dialog.querySelector('[role="textbox"][contenteditable="true"]');
    if (!bodyEl) throw new Error("Could not find message body");

    bodyEl.focus();
    if (bodyHtml) {
      bodyEl.innerHTML = bodyHtml;
    } else {
      bodyEl.innerHTML = "";
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, body);
    }
    bodyEl.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await sleep(300);
  }

  function findSendButton(dialog) {
    return (
      dialog.querySelector('[data-tooltip*="Send"]') ||
      dialog.querySelector('[aria-label*="Send"][role="button"]') ||
      dialog.querySelector('div[role="button"][aria-label^="Send"]') ||
      [...dialog.querySelectorAll('div[role="button"]')].find((el) => {
        const t = el.getAttribute("data-tooltip") || el.getAttribute("aria-label") || el.textContent || "";
        return /^Send\b/i.test(t.trim());
      })
    );
  }

  async function discardCompose(dialog) {
    const discard =
      dialog.querySelector('[aria-label="Discard draft"]') ||
      dialog.querySelector('[data-tooltip="Discard draft"]') ||
      dialog.querySelector('[aria-label="Discard draft "]');
    if (discard) {
      discard.click();
      await sleep(400);
    }
  }

  async function clickSend(dialog) {
    const sendBtn = findSendButton(dialog);
    if (!sendBtn) throw new Error("Could not find Send button");
    sendBtn.click();
    await sleep(2500);
  }

  async function openCompose() {
    // Always start fresh — discard stale compose windows
    const existing = getComposeDialog();
    if (existing) {
      await discardCompose(existing);
      await sleep(500);
    }

    const composeBtn = findComposeButton();
    if (!composeBtn) throw new Error("Compose button not found — open Gmail inbox first");
    composeBtn.click();
    return waitForCompose();
  }

  async function sendOneEmail({ to, cc, subject, body, bodyHtml }) {
    if (!to?.includes("@")) throw new Error("Recipient email is missing");

    const dialog = await openCompose();
    await fillRecipient(dialog, to);
    await fillCc(dialog, cc);
    await fillSubject(dialog, subject);
    await fillBody(dialog, body, bodyHtml);
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
