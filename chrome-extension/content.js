// Jarvis Chrome Extension — Content Script
// Runs on every page, scans for forms, injects the sidebar

(function () {
  if (window.__jarvisInjected) return;
  window.__jarvisInjected = true;

  // ── Sidebar injection ──────────────────────────────────────────────────────

  let sidebarEl = null;
  let sidebarOpen = false;

  function createSidebar() {
    if (sidebarEl) return;

    const container = document.createElement("div");
    container.id = "jarvis-sidebar-root";
    container.innerHTML = `
      <div id="jarvis-sidebar" style="
        position: fixed; top: 0; right: -420px; width: 400px; height: 100vh;
        background: #0a0a0a; border-left: 1px solid #1f1f1f;
        z-index: 2147483647; display: flex; flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: -8px 0 32px rgba(0,0,0,0.6);
        overflow: hidden;
      ">
        <!-- Header -->
        <div style="
          padding: 14px 16px; border-bottom: 1px solid #1f1f1f;
          display: flex; align-items: center; justify-content: space-between;
          background: #0a0a0a; flex-shrink: 0;
        ">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="
              width: 24px; height: 24px; background: #fff; border-radius: 6px;
              display: flex; align-items: center; justify-content: center;
            ">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" fill="#0a0a0a"/>
              </svg>
            </div>
            <span style="font-size: 13px; font-weight: 600; color: #fff;">Jarvis</span>
            <span id="jarvis-badge" style="
              font-size: 10px; color: #737373; background: #1a1a1a;
              padding: 1px 6px; border-radius: 4px; border: 1px solid #262626;
            ">Reelin AI</span>
          </div>
          <button id="jarvis-close-btn" style="
            background: none; border: none; cursor: pointer; color: #525252;
            padding: 4px; border-radius: 4px; line-height: 0;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Status bar -->
        <div id="jarvis-status-bar" style="
          padding: 10px 16px; background: #111; border-bottom: 1px solid #1f1f1f;
          flex-shrink: 0;
        ">
          <p id="jarvis-status-text" style="font-size: 12px; color: #737373; margin: 0;">
            Ready — pick a mode and scan
          </p>
        </div>

        <!-- Mode tabs -->
        <div id="jarvis-mode-tabs" style="
          display: flex; gap: 4px; padding: 8px 16px; border-bottom: 1px solid #1f1f1f; flex-shrink: 0;
        ">
          <button id="jarvis-mode-form" class="jarvis-mode-btn" data-mode="form">Fill Form</button>
          <button id="jarvis-mode-emails" class="jarvis-mode-btn jarvis-mode-active" data-mode="emails">Find Emails</button>
          <button id="jarvis-mode-send" class="jarvis-mode-btn" data-mode="send" style="display:none">Send Emails</button>
        </div>

        <!-- Main content -->
        <div id="jarvis-content" style="flex: 1; overflow-y: auto; padding: 12px 16px;">
          <div id="jarvis-loading" style="display: none; text-align: center; padding: 40px 0;">
            <div class="jarvis-spinner"></div>
            <p style="font-size: 12px; color: #525252; margin-top: 12px;">Analyzing...</p>
          </div>
          <div id="jarvis-fields-list" style="display: none;"></div>
          <div id="jarvis-people-list" style="display: none;"></div>
          <div id="jarvis-send-panel" style="display: none;"></div>
          <div id="jarvis-empty" style="display: none; text-align: center; padding: 40px 0;">
            <p id="jarvis-empty-text" style="font-size: 12px; color: #525252;">No form fields detected on this page.</p>
            <p style="font-size: 11px; color: #404040; margin-top: 4px;">Navigate to an application form or team page to get started.</p>
          </div>
        </div>

        <!-- Footer actions -->
        <div id="jarvis-footer" style="
          padding: 12px 16px; border-top: 1px solid #1f1f1f;
          display: flex; gap: 8px; flex-shrink: 0; background: #0a0a0a;
        ">
          <button id="jarvis-scan-btn" style="
            flex: 1; background: #1a1a1a; color: #a3a3a3; border: 1px solid #262626;
            border-radius: 7px; padding: 8px; font-size: 12px; font-weight: 500;
            cursor: pointer; transition: all 0.15s;
          ">Scan Page</button>
          <button id="jarvis-action-btn" style="
            flex: 2; background: #fff; color: #0a0a0a; border: none;
            border-radius: 7px; padding: 8px; font-size: 12px; font-weight: 600;
            cursor: pointer; transition: all 0.15s; display: flex;
            align-items: center; justify-content: center; gap: 6px;
          ">Copy All Emails</button>
        </div>
      </div>

      <!-- Toggle tab -->
      <div id="jarvis-toggle-tab" style="
        position: fixed; right: 0; top: 50%; transform: translateY(-50%);
        width: 32px; background: #fff; border-radius: 8px 0 0 8px;
        cursor: pointer; z-index: 2147483646; padding: 10px 6px;
        display: flex; flex-direction: column; align-items: center; gap: 4px;
        box-shadow: -4px 0 12px rgba(0,0,0,0.3);
        transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      ">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" fill="#0a0a0a"/>
        </svg>
        <span style="font-size: 8px; font-weight: 700; color: #0a0a0a; writing-mode: vertical-rl; transform: rotate(180deg); letter-spacing: 1px;">JARVIS</span>
      </div>
    `;

    // Spinner style
    const style = document.createElement("style");
    style.textContent = `
      .jarvis-spinner {
        width: 24px; height: 24px; border: 2px solid #262626;
        border-top-color: #fff; border-radius: 50%;
        animation: jarvis-spin 0.8s linear infinite;
        margin: 0 auto;
      }
      @keyframes jarvis-spin { to { transform: rotate(360deg); } }
      #jarvis-fields-list .jarvis-field-item {
        border: 1px solid #1f1f1f; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px;
        background: #111;
      }
      #jarvis-fields-list .jarvis-field-item:hover { border-color: #333; }
      #jarvis-fields-list textarea, #jarvis-fields-list input, #jarvis-fields-list select {
        width: 100%; background: #1a1a1a; border: 1px solid #262626; color: #d4d4d4;
        border-radius: 6px; padding: 6px 8px; font-size: 11px; font-family: inherit;
        resize: vertical; box-sizing: border-box; margin-top: 4px;
      }
      #jarvis-fields-list textarea:focus, #jarvis-fields-list input:focus {
        outline: none; border-color: #525252;
      }
      .jarvis-field-label {
        font-size: 11px; color: #737373; font-weight: 500; display: flex;
        align-items: center; gap: 4px;
      }
      .jarvis-field-required { color: #ef4444; }
      .jarvis-field-type {
        font-size: 9px; background: #1a1a1a; color: #525252;
        padding: 1px 5px; border-radius: 3px; border: 1px solid #262626;
      }
      .jarvis-mode-btn {
        flex: 1; background: #1a1a1a; color: #737373; border: 1px solid #262626;
        border-radius: 6px; padding: 6px 8px; font-size: 11px; font-weight: 500;
        cursor: pointer; transition: all 0.15s;
      }
      .jarvis-mode-btn:hover { border-color: #404040; color: #a3a3a3; }
      .jarvis-mode-active { background: #fff; color: #0a0a0a; border-color: #fff; }
      .jarvis-person-item {
        border: 1px solid #1f1f1f; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px;
        background: #111;
      }
      .jarvis-person-item:hover { border-color: #333; }
      .jarvis-email-found { color: #34d399; font-size: 11px; font-family: monospace; }
      .jarvis-email-missing { color: #525252; font-size: 11px; font-style: italic; }
      .jarvis-copy-btn {
        background: #1a1a1a; border: 1px solid #262626; color: #a3a3a3;
        border-radius: 4px; padding: 2px 8px; font-size: 10px; cursor: pointer;
      }
      .jarvis-copy-btn:hover { border-color: #525252; color: #fff; }
      .jarvis-sent-btn {
        background: #1a1a1a; border: 1px solid #262626; color: #a3a3a3;
        border-radius: 4px; padding: 2px 8px; font-size: 10px; cursor: pointer;
      }
      .jarvis-sent-btn:hover { border-color: #3b82f6; color: #93c5fd; }
      .jarvis-sent-btn.jarvis-sent-done {
        background: #052e16; border-color: #166534; color: #34d399; cursor: default;
      }
      .jarvis-sent-btn:disabled { opacity: 0.7; }
      .jarvis-send-item {
        border: 1px solid #1f1f1f; border-radius: 8px; padding: 8px 10px; margin-bottom: 6px;
        background: #111; display: flex; align-items: flex-start; gap: 8px; cursor: pointer;
      }
      .jarvis-send-item:hover { border-color: #333; }
      .jarvis-send-item.jarvis-send-done { opacity: 0.5; }
      .jarvis-send-item input[type="checkbox"] { margin-top: 2px; accent-color: #fff; }
      .jarvis-template-input {
        width: 100%; background: #111; border: 1px solid #262626; border-radius: 6px;
        color: #e5e5e5; font-size: 11px; padding: 8px; box-sizing: border-box; font-family: inherit;
      }
      .jarvis-template-input:focus { outline: none; border-color: #525252; }
      .jarvis-template-body { min-height: 100px; resize: vertical; font-family: inherit; line-height: 1.4; }
      .jarvis-draft-btn {
        background: #1a1a1a; border: 1px solid #262626; color: #a3a3a3;
        border-radius: 4px; padding: 4px 8px; font-size: 10px; cursor: pointer; margin-right: 4px; margin-bottom: 4px;
      }
      .jarvis-draft-btn:hover { border-color: #525252; color: #fff; }
      .jarvis-stop-btn { background: #450a0a !important; color: #fca5a5 !important; border: 1px solid #7f1d1d !important; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(container);
    sidebarEl = container;

    // Events
    document.getElementById("jarvis-close-btn").addEventListener("click", closeSidebar);
    document.getElementById("jarvis-toggle-tab").addEventListener("click", toggleSidebar);
    document.getElementById("jarvis-scan-btn").addEventListener("click", () => runScan());
    document.getElementById("jarvis-action-btn").addEventListener("click", () => runAction());
    document.getElementById("jarvis-mode-form").addEventListener("click", () => {
      setMode("form");
      if (mappedFields.length === 0) scanAndMap();
    });
    document.getElementById("jarvis-mode-emails").addEventListener("click", () => {
      setMode("emails");
      if (peopleResults.length === 0) scanPeopleEmails();
    });
    document.getElementById("jarvis-mode-send").addEventListener("click", () => {
      setMode("send");
      loadOutreachQueue();
    });

    // Show Send Emails tab on Gmail
    if (window.__jarvisGmail?.isGmail()) {
      document.getElementById("jarvis-mode-send").style.display = "block";
    }
  }

  let sidebarMode = "emails";
  let peopleResults = [];
  let detectedCompany = "";
  let hasScanned = false;
  const emailedPeople = new Set();
  let outreachQueue = [];
  let emailDrafts = [];
  let sendQueueRunning = false;
  let sendQueueStop = false;
  let sendTemplate = { subject: "", body: "" };

  function detectPageIntent() {
    if (window.__jarvisGmail?.isGmail()) return "send";

    const fields = extractFormFields();
    const { candidateNames } = extractPeopleFromPage();

    const textareas = fields.filter(f => f.type === "textarea").length;
    const selects = fields.filter(f => f.type === "select" || f.type === "select-one").length;
    // Real application forms — many fields or multiple long answers
    const isApplicationForm = textareas >= 2 || (fields.length >= 10 && textareas >= 1) || (fields.length >= 8 && selects >= 2);

    if (isApplicationForm) return "form";
    if (candidateNames.length >= 1) return "emails";
    // Ignore small forms (newsletter, search, login) — default to people lookup
    return "emails";
  }

  function showIdleState() {
    showLoading(false);
    showEmpty(false);
    document.getElementById("jarvis-fields-list").style.display = "none";
    document.getElementById("jarvis-people-list").style.display = "none";
    document.getElementById("jarvis-send-panel").style.display = "none";
  }

  function setMode(mode) {
    sidebarMode = mode;
    document.querySelectorAll(".jarvis-mode-btn").forEach(btn => {
      btn.classList.toggle("jarvis-mode-active", btn.dataset.mode === mode);
    });
    const actionBtn = document.getElementById("jarvis-action-btn");
    const scanBtn = document.getElementById("jarvis-scan-btn");
    document.getElementById("jarvis-fields-list").style.display = "none";
    document.getElementById("jarvis-people-list").style.display = "none";
    document.getElementById("jarvis-send-panel").style.display = "none";

    if (mode === "form") {
      actionBtn.textContent = "Fill Form";
      actionBtn.classList.remove("jarvis-stop-btn");
      scanBtn.textContent = "Scan Form";
      document.getElementById("jarvis-fields-list").style.display = mappedFields.length ? "block" : "none";
      if (!mappedFields.length) showIdleState();
      setStatus("Form fill mode");
    } else if (mode === "send") {
      actionBtn.textContent = sendQueueRunning ? "Stop Sending" : "Send Emails";
      actionBtn.classList.toggle("jarvis-stop-btn", sendQueueRunning);
      scanBtn.textContent = "Refresh List";
      document.getElementById("jarvis-send-panel").style.display = "block";
      if (!outreachQueue.length) showIdleState();
      setStatus("Gmail outreach — select investors and send");
    } else {
      actionBtn.textContent = "Copy All Emails";
      actionBtn.classList.remove("jarvis-stop-btn");
      scanBtn.textContent = "Scan Page";
      document.getElementById("jarvis-people-list").style.display = peopleResults.length ? "block" : "none";
      if (!peopleResults.length) showIdleState();
      setStatus("Email finder mode");
    }
  }

  function runScan() {
    if (sidebarMode === "form") scanAndMap();
    else if (sidebarMode === "send") loadOutreachQueue();
    else scanPeopleEmails();
  }

  function runAction() {
    if (sidebarMode === "form") fillForm();
    else if (sidebarMode === "send") {
      if (sendQueueRunning) stopSendQueue();
      else startSendQueue();
    }
    else copyAllEmails();
  }

  function openSidebar(options = {}) {
    createSidebar();
    sidebarOpen = true;
    document.getElementById("jarvis-sidebar").style.right = "0";
    document.getElementById("jarvis-toggle-tab").style.right = "400px";

    const mode = options.mode || detectPageIntent();
    setMode(mode);

    if (options.autoScan !== false) {
      runScan();
    } else if (!hasScanned) {
      showIdleState();
    }
  }

  function closeSidebar() {
    if (!sidebarEl) return;
    sidebarOpen = false;
    document.getElementById("jarvis-sidebar").style.right = "-420px";
    document.getElementById("jarvis-toggle-tab").style.right = "0";
  }

  function toggleSidebar() {
    if (sidebarOpen) closeSidebar();
    else openSidebar({ autoScan: true });
  }

  // ── Form scanning ──────────────────────────────────────────────────────────

  let mappedFields = [];

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0 || el.tagName === "TEXTAREA";
  }

  function extractFormFields() {
    const fields = [];
    const radioGroups = {};
    const inputs = document.querySelectorAll("input, textarea, select");

    inputs.forEach((el, idx) => {
      const type = (el.type || el.tagName.toLowerCase()).toLowerCase();
      if (["hidden", "submit", "button", "reset", "image", "file"].includes(type)) return;
      if (!isVisible(el)) return; // skip invisible fields

      let label = "";
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        if (labelEl) label = labelEl.textContent?.trim() || "";
      }
      if (!label) {
        const parent = el.parentElement;
        if (parent) {
          const labelEl = parent.querySelector("label");
          if (labelEl) label = labelEl.textContent?.trim() || "";
        }
      }
      // Walk up to find a nearby label/legend/heading
      if (!label) {
        let p = el.parentElement;
        for (let i = 0; i < 4 && p; i++) {
          const legend = p.querySelector("legend");
          const span = p.querySelector("span, p, div > label");
          if (legend && legend.textContent?.trim()) { label = legend.textContent.trim(); break; }
          if (span && span.textContent?.trim()) { label = span.textContent.trim().split("\n")[0].trim(); break; }
          p = p.parentElement;
        }
      }
      if (!label) label = el.placeholder || el.name || el.getAttribute("aria-label") || `Field ${idx}`;

      if (type === "radio") {
        const groupName = el.name || el.id;
        if (!groupName || radioGroups[groupName]) return;
        radioGroups[groupName] = true;

        let groupLabel = "";
        let p = el.parentElement;
        for (let i = 0; i < 6 && p; i++) {
          const legend = p.querySelector("legend");
          if (legend) { groupLabel = legend.textContent?.trim() || ""; break; }
          p = p.parentElement;
        }

        const radios = document.querySelectorAll(`input[type="radio"][name="${groupName}"]`);
        const options = [];
        radios.forEach(r => {
          let optLabel = r.value;
          if (r.id) {
            const l = document.querySelector(`label[for="${r.id}"]`);
            if (l) optLabel = l.textContent?.trim() || r.value;
          }
          const parentLabel = r.closest("label");
          if (parentLabel) optLabel = parentLabel.textContent?.trim() || r.value;
          options.push(optLabel);
        });

        fields.push({
          label: (groupLabel || label || groupName).substring(0, 200),
          type: "radio",
          selector: `input[type="radio"][name="${groupName}"]`,
          required: el.required || false,
          options,
          name: groupName,
          suggestedValue: "",
        });
        return;
      }

      const options = [];
      if (el.tagName === "SELECT") {
        el.querySelectorAll("option").forEach(opt => { if (opt.value) options.push(opt.text); });
      }

      // Build a precise selector using id first, then tag+name, then tag+type+index
      let selector;
      if (el.id) {
        selector = `#${CSS.escape(el.id)}`;
      } else if (el.name) {
        const tag = el.tagName.toLowerCase();
        const typeAttr = type !== "textarea" && type !== "select-one" ? `[type="${type}"]` : "";
        selector = `${tag}${typeAttr}[name="${el.name}"]`;
      } else {
        const tag = el.tagName.toLowerCase();
        const sameType = Array.from(document.querySelectorAll(`${tag}[placeholder="${el.placeholder}"]`));
        const nthIdx = sameType.indexOf(el);
        selector = nthIdx >= 0 ? `${tag}:nth-of-type(${idx + 1})` : `${tag}:nth-of-type(${idx + 1})`;
      }

      fields.push({
        label: label.substring(0, 200),
        type,
        selector,
        required: el.required || false,
        options,
        name: el.name || "",
        suggestedValue: "",
      });
    });

    return fields;
  }

  async function scanAndMap() {
    setMode("form");
    setStatus("Scanning form fields...");
    showLoading(true);
    document.getElementById("jarvis-fields-list").style.display = "none";
    document.getElementById("jarvis-people-list").style.display = "none";
    showEmpty(false);
    hasScanned = true;

    const fields = extractFormFields();

    if (fields.length === 0) {
      showLoading(false);
      showEmpty(true);
      setStatus("No form fields found on this page");
      return;
    }

    setStatus(`Found ${fields.length} fields — asking Jarvis AI to fill them...`);

    // Ask background to call Jarvis API with 25s timeout
    const pageText = document.body.innerText.substring(0, 2000);
    const pageTitle = document.title;

    let response;
    try {
      const timeoutPromise = new Promise(resolve =>
        setTimeout(() => resolve({ success: false, error: "Timed out — showing fields without AI values" }), 25000)
      );
      const apiPromise = sendMessage({ type: "ANALYZE_FIELDS", fields, pageTitle, pageText });
      response = await Promise.race([apiPromise, timeoutPromise]);
    } catch {
      response = { success: false, error: "Request failed" };
    }

    if (response.success && response.data?.fields) {
      mappedFields = response.data.fields;
      setStatus(`Ready — ${mappedFields.filter(f => f.suggestedValue).length}/${mappedFields.length} fields filled by AI`);
    } else {
      // Fall back: show fields with empty values user can fill manually
      mappedFields = fields;
      setStatus(`${fields.length} fields found${response.error ? ` (${response.error})` : ""} — fill manually or retry`);
    }

    showLoading(false);
    renderFields(mappedFields);
  }

  function renderFields(fields) {
    const list = document.getElementById("jarvis-fields-list");
    list.innerHTML = "";
    showEmpty(false);
    list.style.display = "block";

    fields.forEach((field, idx) => {
      const item = document.createElement("div");
      item.className = "jarvis-field-item";

      const labelRow = `
        <div class="jarvis-field-label">
          <span>${field.label}</span>
          ${field.required ? '<span class="jarvis-field-required">*</span>' : ""}
          <span class="jarvis-field-type">${field.type}</span>
        </div>
      `;

      let input = "";
      if (field.type === "textarea" || (field.suggestedValue || "").length > 100) {
        input = `<textarea rows="3" data-idx="${idx}">${field.suggestedValue || ""}</textarea>`;
      } else if (field.options && field.options.length > 0) {
        const opts = field.options.map(o =>
          `<option value="${o}" ${o === field.suggestedValue ? "selected" : ""}>${o}</option>`
        ).join("");
        if (field.type === "radio") {
          input = `<select data-idx="${idx}"><option value="">-- select --</option>${opts}</select>`;
        } else {
          input = `<select data-idx="${idx}"><option value="">-- select --</option>${opts}</select>`;
        }
      } else {
        input = `<input type="text" value="${(field.suggestedValue || "").replace(/"/g, "&quot;")}" data-idx="${idx}" />`;
      }

      item.innerHTML = labelRow + input;
      list.appendChild(item);

      // Listen for changes
      const inputEl = item.querySelector("[data-idx]");
      if (inputEl) {
        inputEl.addEventListener("change", e => {
          mappedFields[idx].suggestedValue = e.target.value;
        });
        inputEl.addEventListener("input", e => {
          mappedFields[idx].suggestedValue = e.target.value;
        });
      }
    });
  }

  // ── People & email finder ───────────────────────────────────────────────────

  const NAME_REGEX = /^[A-Z][a-z]+(?:['\u2019][a-z]+)?(?: [A-Z][a-z]+(?:['\u2019][a-z]+)?)+$/;
  const SKIP_NAME_WORDS = new Set([
    "About", "Contact", "Team", "Home", "Menu", "Search", "Login", "Sign", "Read",
    "Learn", "More", "View", "All", "Our", "The", "New", "Get", "Join", "Apply",
    "Privacy", "Terms", "Cookie", "Subscribe", "Follow", "Share", "Back", "Next",
  ]);

  function extractPeopleFromPage() {
    const names = new Set();
    const onPageEmails = [];

    document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
      const email = decodeURIComponent(a.href.replace(/^mailto:/i, "").split("?")[0]).trim();
      if (!email.includes("@")) return;
      const name = a.textContent.trim();
      onPageEmails.push({ name: name.length > 2 && !name.includes("@") ? name : undefined, email });
    });

    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
      try {
        const walk = (obj) => {
          if (!obj || typeof obj !== "object") return;
          if (Array.isArray(obj)) { obj.forEach(walk); return; }
          if (obj["@type"] === "Person" && obj.name) names.add(String(obj.name).trim());
          Object.values(obj).forEach(walk);
        };
        walk(JSON.parse(script.textContent));
      } catch { /* ignore */ }
    });

    const teamSel = '[class*="team" i], [class*="people" i], [class*="staff" i], [class*="member" i], [class*="partner" i], [id*="team" i]';
    document.querySelectorAll(`${teamSel} h2, ${teamSel} h3, ${teamSel} h4, ${teamSel} h5, ${teamSel} strong, ${teamSel} [class*="name" i]`).forEach(el => {
      if (!isVisible(el)) return;
      const text = el.textContent.trim().split("\n")[0].trim();
      if (looksLikePersonName(text)) names.add(text);
    });

    document.querySelectorAll("h2, h3, h4, h5, h6, strong, b").forEach(el => {
      if (!isVisible(el)) return;
      const text = el.textContent.trim().split("\n")[0].trim();
      if (looksLikePersonName(text)) names.add(text);
    });

    // Names in team/profile cards (common on VC sites)
    document.querySelectorAll(
      '[class*="team" i] *, [class*="people" i] *, [class*="member" i] *, [class*="profile" i] *, [class*="partner" i] *'
    ).forEach(el => {
      if (!isVisible(el)) return;
      if (el.children.length > 2) return;
      const text = el.textContent.trim().split("\n")[0].trim();
      if (looksLikePersonName(text)) names.add(text);
    });

    document.querySelectorAll("img[alt]").forEach(img => {
      const alt = img.getAttribute("alt")?.trim() || "";
      if (looksLikePersonName(alt)) names.add(alt);
    });

    return { candidateNames: [...names], onPageEmails };
  }

  function looksLikePersonName(text) {
    if (!text || text.length > 45 || text.length < 5) return false;
    if (!NAME_REGEX.test(text)) return false;
    if (SKIP_NAME_WORDS.has(text.split(" ")[0])) return false;
    if (/\d|@|http|\.com|inc\.|llc|ventures|capital|partners/i.test(text)) return false;
    return true;
  }

  function getVisiblePageText() {
    const parts = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      const parent = walk.currentNode.parentElement;
      if (!parent || !isVisible(parent)) continue;
      if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) continue;
      const t = walk.currentNode.textContent.trim();
      if (t.length > 1) parts.push(t);
    }
    return parts.join(" ").substring(0, 12000);
  }

  async function scanPeopleEmails() {
    setMode("emails");
    setStatus("Scanning page for people...");
    showLoading(true);
    document.getElementById("jarvis-fields-list").style.display = "none";
    document.getElementById("jarvis-people-list").style.display = "none";
    showEmpty(false);
    hasScanned = true;

    const { candidateNames, onPageEmails } = extractPeopleFromPage();
    const pageText = getVisiblePageText();

    // Always send to backend if page has content — AI can find people DOM heuristics miss
    if (pageText.length < 50 && candidateNames.length === 0) {
      showLoading(false);
      showEmpty(true);
      document.getElementById("jarvis-empty-text").textContent = "No content detected on this page";
      setStatus("Try a team page, about page, or partner directory");
      return;
    }

    setStatus(
      candidateNames.length
        ? `Found ${candidateNames.length} people — searching for emails...`
        : "Analyzing page for people — searching for emails..."
    );

    let response;
    try {
      const timeoutPromise = new Promise(resolve =>
        setTimeout(() => resolve({ success: false, error: "Timed out — try again" }), 120000)
      );
      const apiPromise = sendMessage({
        type: "FIND_PEOPLE_EMAILS",
        pageUrl: window.location.href,
        pageTitle: document.title,
        pageText,
        candidateNames,
        onPageEmails,
      });
      response = await Promise.race([apiPromise, timeoutPromise]);
    } catch {
      response = { success: false, error: "Request failed" };
    }

    showLoading(false);

    if (response.success && response.data) {
      peopleResults = response.data.people || [];
      detectedCompany = response.data.company || "";
      const found = peopleResults.filter(p => p.email).length;
      setStatus(`${found}/${peopleResults.length} emails found${detectedCompany ? ` — ${detectedCompany}` : ""}`);
      renderPeopleResults(peopleResults, detectedCompany);
    } else {
      peopleResults = candidateNames.map(name => ({ name, emailSource: "none" }));
      setStatus(response.error || "Email search failed");
      if (peopleResults.length) renderPeopleResults(peopleResults, "");
      else {
        showEmpty(true);
        document.getElementById("jarvis-empty-text").textContent = response.error || "No people found";
      }
    }
  }

  function renderPeopleResults(people, company) {
    const list = document.getElementById("jarvis-people-list");
    list.innerHTML = "";
    showEmpty(false);
    list.style.display = "block";

    if (company) {
      const header = document.createElement("p");
      header.style.cssText = "font-size:11px;color:#737373;margin:0 0 10px";
      header.textContent = `${people.length} people on ${company}`;
      list.appendChild(header);
    }

    people.forEach((person) => {
      const item = document.createElement("div");
      item.className = "jarvis-person-item";

      const emailHtml = person.email
        ? `<span class="jarvis-email-found">${person.email}</span>
           <button class="jarvis-copy-btn" data-email="${person.email}">Copy</button>
           <button class="jarvis-sent-btn${person.emailed || emailedPeople.has(person.email) ? " jarvis-sent-done" : ""}" data-name="${person.name.replace(/"/g, "&quot;")}" data-email="${person.email}" data-title="${(person.title || "").replace(/"/g, "&quot;")}" ${person.emailed || emailedPeople.has(person.email) ? "disabled" : ""}>${person.emailed || emailedPeople.has(person.email) ? "Sent ✓" : "Mark Sent"}</button>`
        : `<span class="jarvis-email-missing">Not found</span>`;

      const sourceTag = person.emailSource === "page" ? "on page"
        : person.emailSource === "google" ? "web search" : "";

      item.innerHTML = `
        <div style="min-width:0">
          <p style="font-size:12px;font-weight:600;color:#e5e5e5;margin:0">${person.name}</p>
          ${person.title ? `<p style="font-size:10px;color:#525252;margin:2px 0 0">${person.title}</p>` : ""}
          <div style="margin-top:6px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            ${emailHtml}
            ${sourceTag ? `<span style="font-size:9px;color:#404040">${sourceTag}</span>` : ""}
          </div>
        </div>
      `;
      list.appendChild(item);

      const copyBtn = item.querySelector(".jarvis-copy-btn");
      if (copyBtn) {
        copyBtn.addEventListener("click", () => {
          navigator.clipboard.writeText(copyBtn.dataset.email);
          copyBtn.textContent = "Copied!";
          setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
        });
      }

      const sentBtn = item.querySelector(".jarvis-sent-btn");
      if (sentBtn && !sentBtn.disabled) {
        sentBtn.addEventListener("click", () => markPersonEmailed(sentBtn, person));
      }
    });
  }

  async function markPersonEmailed(btn, person) {
    if (!person.email || btn.disabled) return;
    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
      const response = await chrome.runtime.sendMessage({
        type: "MARK_EMAILED",
        name: person.name,
        email: person.email,
        title: person.title || "",
        company: detectedCompany || "",
        pageUrl: window.location.href,
      });

      if (response?.success) {
        person.emailed = true;
        emailedPeople.add(person.email);
        btn.textContent = "Sent ✓";
        btn.classList.add("jarvis-sent-done");
        setStatus(response.message || `Marked ${person.name} as emailed`);
      } else {
        btn.disabled = false;
        btn.textContent = "Mark Sent";
        setStatus(response?.error || "Failed to save contact");
      }
    } catch {
      btn.disabled = false;
      btn.textContent = "Mark Sent";
      setStatus("Failed to save — check Jarvis login in extension popup");
    }
  }

  function copyAllEmails() {
    const emails = peopleResults.filter(p => p.email).map(p => p.email);
    if (emails.length === 0) {
      setStatus("No emails to copy — scan the page first");
      return;
    }
    navigator.clipboard.writeText(emails.join(", "));
    setStatus(`Copied ${emails.length} emails to clipboard`);
  }

  // ── Gmail send mode ────────────────────────────────────────────────────────

  function interpolateTemplate(text, person) {
    const firstName = (person.name || "").split(/\s+/)[0] || person.name || "";
    return (text || "")
      .replace(/\{\{firstName\}\}/gi, firstName)
      .replace(/\{\{name\}\}/gi, person.name || "")
      .replace(/\{\{company\}\}/gi, person.company || "")
      .replace(/\{\{email\}\}/gi, person.email || "");
  }

  async function loadOutreachQueue() {
    if (!window.__jarvisGmail?.isGmail()) {
      setStatus("Open Gmail to use Send Emails mode");
      return;
    }

    showLoading(true);
    showEmpty(false);

    const [queueRes, draftsRes] = await Promise.all([
      sendMessage({ type: "GET_OUTREACH_QUEUE" }),
      sendMessage({ type: "GET_EMAIL_DRAFTS" }),
    ]);

    showLoading(false);

    if (!queueRes.success) {
      setStatus(queueRes.error || "Failed to load outreach queue — log in via extension popup");
      showEmpty(true);
      document.getElementById("jarvis-empty-text").textContent = queueRes.error || "Could not load investors";
      return;
    }

    emailDrafts = draftsRes.success ? (draftsRes.data || []) : [];
    const data = queueRes.data || {};
    outreachQueue = [
      ...(data.investors || []).map(i => ({ ...i, selected: true, sent: false })),
      ...(data.contacts || []).map(c => ({ ...c, selected: false, sent: false })),
    ];

    if (!sendTemplate.subject && emailDrafts.length) {
      sendTemplate.subject = emailDrafts[0].subject || "";
      sendTemplate.body = emailDrafts[0].body || "";
    }

    renderSendPanel();
    setStatus(`${outreachQueue.length} ready to email (${data.investors?.length || 0} investors)`);
  }

  function renderSendPanel() {
    const panel = document.getElementById("jarvis-send-panel");
    if (!panel) return;

    showEmpty(false);
    panel.style.display = "block";

    const selectedCount = outreachQueue.filter(p => p.selected && !p.sent).length;
    const draftsHtml = emailDrafts.length
      ? `<div style="margin-bottom:8px"><p style="font-size:10px;color:#525252;margin:0 0 4px">Load from Gmail draft:</p>${emailDrafts.slice(0, 5).map((d, i) =>
          `<button class="jarvis-draft-btn" data-draft-idx="${i}">${(d.subject || "Draft").substring(0, 30)}</button>`
        ).join("")}</div>`
      : "";

    panel.innerHTML = `
      <div style="margin-bottom:12px">
        <p style="font-size:11px;color:#737373;margin:0 0 8px">Email template — use {{firstName}}, {{name}}, {{company}}</p>
        ${draftsHtml}
        <input id="jarvis-send-subject" class="jarvis-template-input" placeholder="Subject" value="${escapeHtml(sendTemplate.subject)}" style="margin-bottom:6px" />
        <textarea id="jarvis-send-body" class="jarvis-template-input jarvis-template-body" placeholder="Email body...">${escapeHtml(sendTemplate.body)}</textarea>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <p style="font-size:11px;color:#a3a3a3;margin:0;font-weight:600">Recipients (${selectedCount} selected)</p>
        <button id="jarvis-select-all" style="font-size:10px;background:none;border:none;color:#737373;cursor:pointer">Toggle all</button>
      </div>
      <div id="jarvis-send-list"></div>
    `;

    document.getElementById("jarvis-send-subject").addEventListener("input", (e) => {
      sendTemplate.subject = e.target.value;
    });
    document.getElementById("jarvis-send-body").addEventListener("input", (e) => {
      sendTemplate.body = e.target.value;
    });
    document.getElementById("jarvis-select-all").addEventListener("click", () => {
      const allSelected = outreachQueue.every(p => p.selected);
      outreachQueue.forEach(p => { if (!p.sent) p.selected = !allSelected; });
      renderSendPanel();
    });
    panel.querySelectorAll(".jarvis-draft-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const draft = emailDrafts[parseInt(btn.dataset.draftIdx, 10)];
        if (!draft) return;
        sendTemplate.subject = draft.subject || "";
        sendTemplate.body = draft.body || "";
        renderSendPanel();
      });
    });

    const list = document.getElementById("jarvis-send-list");
    if (!outreachQueue.length) {
      list.innerHTML = `<p style="font-size:12px;color:#525252;text-align:center;padding:20px 0">No investors with email in Jarvis</p>`;
      return;
    }

    outreachQueue.forEach((person, idx) => {
      const item = document.createElement("label");
      item.className = `jarvis-send-item${person.sent ? " jarvis-send-done" : ""}`;
      item.innerHTML = `
        <input type="checkbox" ${person.selected ? "checked" : ""} ${person.sent ? "disabled" : ""} data-idx="${idx}" />
        <div style="min-width:0;flex:1">
          <p style="font-size:12px;font-weight:600;color:#e5e5e5;margin:0">${escapeHtml(person.name)}</p>
          <p style="font-size:10px;color:#525252;margin:2px 0 0">${escapeHtml(person.email)}${person.company ? ` · ${escapeHtml(person.company)}` : ""}</p>
          <span style="font-size:9px;color:#404040">${person.type === "investor" ? "investor" : "contact"}${person.sent ? " · sent ✓" : ""}</span>
        </div>
      `;
      const cb = item.querySelector("input");
      cb.addEventListener("change", () => {
        outreachQueue[idx].selected = cb.checked;
        updateSendActionLabel();
      });
      list.appendChild(item);
    });

    updateSendActionLabel();
  }

  function updateSendActionLabel() {
    const btn = document.getElementById("jarvis-action-btn");
    if (!btn || sidebarMode !== "send") return;
    const count = outreachQueue.filter(p => p.selected && !p.sent).length;
    btn.textContent = sendQueueRunning ? "Stop Sending" : `Send Emails (${count})`;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function stopSendQueue() {
    sendQueueStop = true;
    setStatus("Stopping after current email...");
  }

  async function startSendQueue() {
    if (!window.__jarvisGmail?.isGmail()) {
      setStatus("Open mail.google.com to send emails");
      return;
    }

    sendTemplate.subject = document.getElementById("jarvis-send-subject")?.value || sendTemplate.subject;
    sendTemplate.body = document.getElementById("jarvis-send-body")?.value || sendTemplate.body;

    if (!sendTemplate.subject.trim()) { setStatus("Subject is required"); return; }
    if (!sendTemplate.body.trim()) { setStatus("Email body is required"); return; }

    const queue = outreachQueue.filter(p => p.selected && !p.sent && p.email);
    if (!queue.length) { setStatus("Select at least one recipient"); return; }

    sendQueueRunning = true;
    sendQueueStop = false;
    setMode("send");

    let sent = 0;
    let failed = 0;

    for (const person of queue) {
      if (sendQueueStop) break;

      setStatus(`Sending ${sent + failed + 1}/${queue.length} → ${person.name}...`);

      try {
        const subject = interpolateTemplate(sendTemplate.subject, person);
        const body = interpolateTemplate(sendTemplate.body, person);

        await window.__jarvisGmail.sendOneEmail({
          to: person.email,
          subject,
          body,
        });

        person.sent = true;
        person.selected = false;
        sent++;

        if (person.type === "investor") {
          await sendMessage({ type: "MARK_INVESTOR_CONTACTED", id: person.id });
        } else {
          await sendMessage({
            type: "MARK_EMAILED",
            name: person.name,
            email: person.email,
            title: person.title || "",
            company: person.company || "",
            pageUrl: window.location.href,
          });
        }

        renderSendPanel();
        await sleep(2500);
      } catch (err) {
        failed++;
        setStatus(`Failed for ${person.name}: ${err.message || err}`);
        await sleep(1500);
        if (failed >= 3 && sent === 0) {
          setStatus("Too many failures — check Gmail is on inbox view, then retry");
          break;
        }
      }
    }

    sendQueueRunning = false;
    sendQueueStop = false;
    setMode("send");
    setStatus(`Done — sent ${sent}${failed ? `, failed ${failed}` : ""}. Review sent emails in Gmail Sent folder.`);
  }

  // ── Form filling ───────────────────────────────────────────────────────────

  async function fillForm() {
    if (mappedFields.length === 0) {
      setStatus("No fields to fill — scan the page first");
      return;
    }

    setStatus("Filling form...");
    let filled = 0;
    let failed = 0;

    for (const field of mappedFields) {
      if (!field.suggestedValue || !field.selector) continue;
      try {
        if (field.type === "radio") {
          await fillRadio(field);
        } else if (field.type === "select" || field.type === "select-one") {
          await fillSelect(field);
        } else if (field.type === "checkbox") {
          await fillCheckbox(field);
        } else {
          await fillText(field);
        }
        filled++;
      } catch {
        failed++;
      }
    }

    setStatus(`Filled ${filled} fields${failed > 0 ? ` (${failed} skipped)` : ""} — review and submit!`);

    // Highlight filled fields briefly
    document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]), textarea, select").forEach(el => {
      const origOutline = el.style.outline;
      el.style.outline = "2px solid rgba(255,255,255,0.4)";
      el.style.borderRadius = "3px";
      setTimeout(() => { el.style.outline = origOutline; }, 2000);
    });
  }

  async function fillRadio(field) {
    const val = field.suggestedValue.toLowerCase().trim();
    const radios = document.querySelectorAll(`input[type="radio"][name="${field.name}"]`);

    for (const radio of radios) {
      let labelText = (radio.value || "").toLowerCase();
      if (radio.id) {
        const l = document.querySelector(`label[for="${radio.id}"]`);
        if (l) labelText = l.textContent.toLowerCase().trim();
      }
      const parentLabel = radio.closest("label");
      if (parentLabel) labelText = parentLabel.textContent.toLowerCase().trim();

      if (labelText.includes(val) || val.includes(labelText) || radio.value.toLowerCase() === val) {
        radio.click();
        radio.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }
    }
  }

  async function fillSelect(field) {
    let el = document.querySelector(field.selector);
    if (!el && field.name) el = document.querySelector(`select[name="${field.name}"]`);
    if (!el || !isVisible(el)) return;
    const val = field.suggestedValue;
    // Try by text, then by value
    for (const opt of el.options) {
      if (opt.text === val || opt.value === val || opt.text.toLowerCase().includes(val.toLowerCase())) {
        el.value = opt.value;
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }
    }
  }

  async function fillCheckbox(field) {
    let el = document.querySelector(field.selector);
    if (!el && field.name) el = document.querySelector(`input[type="checkbox"][name="${field.name}"]`);
    if (!el || !isVisible(el)) return;
    const checked = ["true", "yes", "1"].includes(field.suggestedValue.toLowerCase());
    el.checked = checked;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function fillText(field) {
    let el = document.querySelector(field.selector);
    if (!el && field.name) {
      el = document.querySelector(`input[name="${field.name}"], textarea[name="${field.name}"]`);
    }
    if (!el || !isVisible(el)) return;
    el.focus();
    el.value = "";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    // Type character by character for React-controlled inputs
    for (const char of field.suggestedValue) {
      el.value += char;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(8);
    }
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.blur();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function setStatus(text) {
    const el = document.getElementById("jarvis-status-text");
    if (el) el.textContent = text;
  }

  function showLoading(show) {
    const el = document.getElementById("jarvis-loading");
    if (el) el.style.display = show ? "block" : "none";
  }

  function showEmpty(show) {
    const el = document.getElementById("jarvis-empty");
    if (el) el.style.display = show ? "block" : "none";
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function sendMessage(msg) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { success: false, error: "No response" });
        }
      });
    });
  }

  // Listen for messages from popup / background
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "OPEN_SIDEBAR") {
      const mode = msg.mode || (msg.autoScan ? undefined : detectPageIntent());
      openSidebar({
        mode,
        autoScan: !!msg.autoScan,
      });
      sendResponse({ success: true });
    } else if (msg.type === "FILL_FORM") {
      fillForm();
      sendResponse({ success: true });
    }
    return true;
  });

  // Auto-show toggle tab on all pages
  createSidebar();

})();
