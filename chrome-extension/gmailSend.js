// Gmail compose automation for Jarvis extension
(function () {
  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function isGmail() {
    return location.hostname === "mail.google.com";
  }

  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
  }

  function walkShadowRoots(root, fn) {
    const result = fn(root);
    if (result) return result;
    const nodes = root.querySelectorAll ? root.querySelectorAll("*") : [];
    for (const node of nodes) {
      if (node.shadowRoot) {
        const inner = walkShadowRoots(node.shadowRoot, fn);
        if (inner) return inner;
      }
    }
    return null;
  }

  function queryAllDocuments(fn) {
    const top = fn(document);
    if (top) return top;
    for (const iframe of document.querySelectorAll("iframe")) {
      try {
        const doc = iframe.contentDocument;
        if (doc) {
          const found = fn(doc);
          if (found) return found;
        }
      } catch { /* cross-origin */ }
    }
    return null;
  }

  function findComposeButton() {
    return queryAllDocuments((doc) =>
      walkShadowRoots(doc, (root) => {
        const selectors = [
          '[gh="cm"]',
          '[data-tooltip="Compose"]',
          '[data-tooltip^="Compose"]',
          'div[role="button"][aria-label="Compose"]',
          'div[role="button"][aria-label^="Compose"]',
          ".T-I-KE",
          'a[href*="compose"]',
        ];
        for (const sel of selectors) {
          const el = root.querySelector(sel);
          if (isVisible(el)) return el;
        }

        for (const el of root.querySelectorAll('[role="button"], button, a, div.T-I')) {
          const label = (
            el.getAttribute("aria-label") ||
            el.getAttribute("data-tooltip") ||
            el.getAttribute("title") ||
            ""
          ).trim();
          const text = (el.textContent || "").trim();
          if (/^compose$/i.test(label) || /^compose$/i.test(text) || label.startsWith("Compose ")) {
            if (isVisible(el)) return el;
          }
        }

        // Sidebar compose: div containing "Compose" text
        for (const span of root.querySelectorAll("span, div")) {
          if (span.children.length > 0) continue;
          if ((span.textContent || "").trim() !== "Compose") continue;
          const btn = span.closest('[role="button"]') || span.closest(".T-I") || span.closest("div[tabindex]");
          if (isVisible(btn)) return btn;
        }

        return null;
      })
    );
  }

  function getComposeDialog() {
    return queryAllDocuments((doc) => {
      const dialogs = [...doc.querySelectorAll('[role="dialog"]')];
      for (let i = dialogs.length - 1; i >= 0; i--) {
        const d = dialogs[i];
        if (d.querySelector('input[name="subjectbox"], input[aria-label*="Subject"], input[aria-label*="subject"]')) {
          return d;
        }
      }

      const inline =
        doc.querySelector(".AD") ||
        doc.querySelector(".aoI") ||
        doc.querySelector('[aria-label="New Message"]')?.closest('[role="dialog"]') ||
        doc.querySelector('[aria-label="New Message"]')?.closest(".AD") ||
        doc.querySelector('input[name="subjectbox"]')?.closest('[role="dialog"]') ||
        doc.querySelector('input[name="subjectbox"]')?.closest(".AD");

      return inline || null;
    });
  }

  async function waitForCompose(timeoutMs = 12000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const dialog = getComposeDialog();
      if (dialog) return dialog;
      await sleep(200);
    }
    throw new Error("Compose window did not open");
  }

  async function triggerComposeKeyboard() {
    const target =
      document.querySelector('[role="main"]') ||
      document.querySelector(".nH") ||
      document.body;
    target.focus();
    await sleep(150);

    for (const type of ["keydown", "keypress", "keyup"]) {
      target.dispatchEvent(
        new KeyboardEvent(type, {
          key: "c",
          code: "KeyC",
          keyCode: type === "keypress" ? 99 : 67,
          which: type === "keypress" ? 99 : 67,
          bubbles: true,
          cancelable: true,
        })
      );
    }
    await sleep(600);
  }

  async function triggerComposeHash() {
    const current = window.location.hash || "#inbox";
    const base = current.split("?")[0] || "#inbox";
    if (!current.includes("compose")) {
      window.location.hash = `${base}?compose=new`;
      await sleep(1200);
    }
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
      '[role="combobox"][aria-label*="To"]',
      '[role="combobox"][aria-label*="to"]',
    ];
    for (const sel of selectors) {
      const el = dialog.querySelector(sel);
      if (el) return el;
    }

    const editables = [...dialog.querySelectorAll('[contenteditable="true"]')];
    const toEditable = editables.find((el) => {
      const label =
        el.getAttribute("aria-label") ||
        el.closest("[aria-label]")?.getAttribute("aria-label") ||
        "";
      return /to/i.test(label);
    });
    return toEditable || editables[0] || null;
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

    for (const key of ["Enter", "Tab"]) {
      toEl.dispatchEvent(
        new KeyboardEvent("keydown", {
          key,
          code: key,
          keyCode: key === "Enter" ? 13 : 9,
          bubbles: true,
          cancelable: true,
        })
      );
      toEl.dispatchEvent(
        new KeyboardEvent("keyup", {
          key,
          code: key,
          keyCode: key === "Enter" ? 13 : 9,
          bubbles: true,
        })
      );
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
    return null;
  }

  async function fillCc(dialog, ccEmail) {
    if (!ccEmail) return;

    let ccEl = findCcField(dialog);
    if (!ccEl) {
      const toggle =
        dialog.querySelector('[aria-label="Cc Bcc"]') ||
        [...dialog.querySelectorAll("span, div, button")].find((s) => (s.textContent || "").trim() === "Cc");
      toggle?.click();
      await sleep(400);
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
      dialog.querySelector('input[aria-label*="subject"]') ||
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
    const existing = getComposeDialog();
    if (existing) {
      await discardCompose(existing);
      await sleep(500);
    }

    // 1. Click Compose button (many Gmail layouts)
    const composeBtn = findComposeButton();
    if (composeBtn) {
      composeBtn.click();
      try {
        return await waitForCompose(8000);
      } catch { /* try fallbacks */ }
    }

    // 2. Gmail keyboard shortcut: c
    await triggerComposeKeyboard();
    try {
      return await waitForCompose(5000);
    } catch { /* try hash */ }

    // 3. URL hash compose
    await triggerComposeHash();
    try {
      return await waitForCompose(8000);
    } catch { /* failed */ }

    // 4. If user already opened compose manually, use it
    const manual = getComposeDialog();
    if (manual) return manual;

    throw new Error("Could not open compose — click Compose once, then hit Test again");
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
