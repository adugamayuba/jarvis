// Jarvis Chrome Extension — Content Script
// Runs on every page, scans for forms, injects the sidebar

(function () {
  if (window.__jarvisInjected) return;
  window.__jarvisInjected = true;

  function sanitizeSuggestedValue(text) {
    if (!text) return text;
    return text
      .replace(/[\u2014\u2013—–]/g, ", ")
      .replace(/[""„«»]/g, "")
      .replace(/"/g, "")
      .replace(/,(\s*,)+/g, ", ")
      .replace(/[ \t]+/g, " ")
      .replace(/^\s+|\s+$/gm, "")
      .trim();
  }

  function sanitizeMappedFields(fields) {
    return fields.map(f => ({
      ...f,
      suggestedValue: sanitizeSuggestedValue(f.suggestedValue || ""),
    }));
  }

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
          <button id="jarvis-pick-field-btn" style="
            flex: 1; background: #1a1a1a; color: #93c5fd; border: 1px solid #1e3a5f;
            border-radius: 7px; padding: 8px; font-size: 12px; font-weight: 500;
            cursor: pointer; transition: all 0.15s; display: none;
          ">Pick Field</button>
          <button id="jarvis-add-all-btn" style="
            flex: 1; background: #1a1a1a; color: #93c5fd; border: 1px solid #1e3a5f;
            border-radius: 7px; padding: 8px; font-size: 12px; font-weight: 500;
            cursor: pointer; transition: all 0.15s; display: none;
          ">Add All</button>
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
      .jarvis-field-item.jarvis-field-highlight {
        border-color: #3b82f6; box-shadow: 0 0 0 1px rgba(59,130,246,0.3);
      }
      .jarvis-pick-active {
        background: #1e3a5f !important; color: #93c5fd !important; border-color: #3b82f6 !important;
      }
      .jarvis-pick-hover {
        outline: 2px dashed #3b82f6 !important;
        outline-offset: 2px;
        box-shadow: 0 0 0 4px rgba(59,130,246,0.15) !important;
        cursor: crosshair !important;
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
      .jarvis-add-all-btn-done {
        background: #052e16 !important; border-color: #166534 !important; color: #34d399 !important;
      }
      .jarvis-send-delete {
        background: none; border: 1px solid #3f1d1d; color: #f87171;
        border-radius: 4px; padding: 2px 7px; font-size: 10px; cursor: pointer; flex-shrink: 0;
      }
      .jarvis-send-delete:hover { border-color: #ef4444; color: #fca5a5; }
      .jarvis-audience-btn {
        flex: 1; background: #1a1a1a; color: #737373; border: 1px solid #262626;
        border-radius: 6px; padding: 5px 6px; font-size: 10px; font-weight: 500; cursor: pointer;
        min-width: 0;
      }
      .jarvis-audience-active { background: #fff; color: #0a0a0a; border-color: #fff; }
      .jarvis-email-extra {
        font-size: 9px; color: #525252; font-family: monospace;
      }
      .jarvis-send-item {
        border: 1px solid #1f1f1f; border-radius: 8px; padding: 8px 10px; margin-bottom: 6px;
        background: #111; display: flex; align-items: flex-start; gap: 8px;
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
      .jarvis-test-btn {
        flex: 1; min-width: 140px; background: #1a1a1a; border: 1px solid #404040; color: #d4d4d4;
        border-radius: 6px; padding: 6px 8px; font-size: 10px; cursor: pointer; text-align: left;
      }
      .jarvis-test-btn:hover { border-color: #737373; color: #fff; }
      .jarvis-test-btn:disabled { opacity: 0.5; cursor: wait; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(container);
    sidebarEl = container;

    // Events
    document.getElementById("jarvis-close-btn").addEventListener("click", closeSidebar);
    document.getElementById("jarvis-toggle-tab").addEventListener("click", toggleSidebar);
    document.getElementById("jarvis-scan-btn").addEventListener("click", () => runScan());
    document.getElementById("jarvis-add-all-btn").addEventListener("click", () => addAllToContacts());
    document.getElementById("jarvis-action-btn").addEventListener("click", () => runAction());
    document.getElementById("jarvis-pick-field-btn").addEventListener("click", () => togglePickFieldMode());
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
  let contactsAdded = false;
  const emailedPeople = new Set();
  let outreachQueue = [];
  let emailDrafts = [];
  let sendQueueRunning = false;
  let sendQueueStop = false;
  let sendAudience = "investor";
  let sendTemplate = { subject: "", body: "", cc: "ligia@reelin.ai" };

  const TEST_EMAILS = [
    { name: "Abel", email: "adugamhq@gmail.com", label: "adugamhq@gmail.com" },
    { name: "Abel", email: "abel@gigadroom.com", label: "abel@gigadroom.com" },
  ];

  function resolveTemplate(audience) {
    switch (audience) {
      case "journalist":
        return window.__jarvisJournalistTemplate;
      case "swiftdroom-b2c":
        return window.__jarvisSwiftdroomB2CTemplate;
      case "swiftdroom-b2b":
        return window.__jarvisSwiftdroomB2BTemplate;
      default:
        return window.__jarvisEmailTemplate;
    }
  }

  function getActiveTemplate() {
    return resolveTemplate(sendAudience);
  }

  function initDefaultTemplate(audience = sendAudience) {
    const tpl = resolveTemplate(audience);
    if (!tpl) return;
    sendTemplate.subject = tpl.subject;
    sendTemplate.body = tpl.bodyPlain;
    sendTemplate.cc = tpl.cc || "";
  }
  initDefaultTemplate();

  function audienceLabel(audience) {
    switch (audience) {
      case "journalist": return "Press / Reelin AI template";
      case "swiftdroom-b2c": return "Swiftdroom · job seeker template";
      case "swiftdroom-b2b": return "Swiftdroom · institution / B2B template";
      default: return "Reelin AI · investor template";
    }
  }

  function audienceQueueHint(audience) {
    switch (audience) {
      case "journalist": return "No journalists with email — scrape press outlets in Jarvis Scraper first";
      case "swiftdroom-b2c": return "No B2C contacts — tag contacts swiftdroom-b2c in Jarvis";
      case "swiftdroom-b2b": return "No B2B contacts — tag contacts swiftdroom-b2b in Jarvis";
      default: return "No contacts with email (not sent) — check Jarvis Contacts page";
    }
  }

  function audienceListLabel(audience) {
    switch (audience) {
      case "journalist": return "journalists";
      case "swiftdroom-b2c": return "job seekers";
      case "swiftdroom-b2b": return "institutions";
      default: return "investors";
    }
  }

  function matchesAudienceFilter(c, audience) {
    const pressSources = [
      "techcrunch", "businessinsider", "theverge", "wired", "arstechnica",
      "venturebeat", "fastcompany", "fortune", "cnbc", "axios", "semafor",
      "mashable", "engadget", "gizmodo", "vox",
    ];
    const isJournalist =
      pressSources.includes(c.source) ||
      c.tags?.includes("journalist") ||
      c.audience === "journalist";
    const isB2C = c.tags?.includes("swiftdroom-b2c") || c.tags?.includes("swiftdroom-user");
    const isB2B = c.tags?.includes("swiftdroom-b2b") || c.tags?.includes("swiftdroom-partner") || c.tags?.includes("swiftdroom-institution");
    const isSwiftdroom = c.source === "swiftdroom" || isB2C || isB2B;
    switch (audience) {
      case "journalist": return isJournalist;
      case "swiftdroom-b2c": return isB2C;
      case "swiftdroom-b2b": return isB2B;
      default: return !isJournalist && !isSwiftdroom;
    }
  }

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

  function updateAddAllButton() {
    const btn = document.getElementById("jarvis-add-all-btn");
    if (!btn) return;
    const withEmail = peopleResults.filter(p => p.email);
    const show = sidebarMode === "emails" && withEmail.length > 0;
    btn.style.display = show ? "block" : "none";
    if (show) {
      btn.textContent = contactsAdded ? "Added ✓" : `Add All (${withEmail.length})`;
      btn.disabled = contactsAdded;
      btn.classList.toggle("jarvis-add-all-btn-done", contactsAdded);
    }
  }

  function setMode(mode) {
    sidebarMode = mode;
    document.querySelectorAll(".jarvis-mode-btn").forEach(btn => {
      btn.classList.toggle("jarvis-mode-active", btn.dataset.mode === mode);
    });
    const actionBtn = document.getElementById("jarvis-action-btn");
    const scanBtn = document.getElementById("jarvis-scan-btn");
    const pickBtn = document.getElementById("jarvis-pick-field-btn");
    const addAllBtn = document.getElementById("jarvis-add-all-btn");
    document.getElementById("jarvis-fields-list").style.display = "none";
    document.getElementById("jarvis-people-list").style.display = "none";
    document.getElementById("jarvis-send-panel").style.display = "none";

    if (mode === "form") {
      actionBtn.textContent = "Fill Form";
      actionBtn.classList.remove("jarvis-stop-btn");
      scanBtn.textContent = "Scan Form";
      if (pickBtn) pickBtn.style.display = "block";
      if (addAllBtn) addAllBtn.style.display = "none";
      document.getElementById("jarvis-fields-list").style.display = mappedFields.length ? "block" : "none";
      if (!mappedFields.length) showIdleState();
      setStatus("Form fill mode");
    } else if (mode === "send") {
      actionBtn.textContent = sendQueueRunning ? "Stop Sending" : "Send Emails";
      actionBtn.classList.toggle("jarvis-stop-btn", sendQueueRunning);
      scanBtn.textContent = "Refresh List";
      if (pickBtn) pickBtn.style.display = "none";
      stopPickFieldMode();
      if (addAllBtn) addAllBtn.style.display = "none";
      document.getElementById("jarvis-send-panel").style.display = "block";
      if (!outreachQueue.length) showIdleState();
      setStatus("Gmail outreach — select investors and send");
    } else {
      actionBtn.textContent = "Copy All Emails";
      actionBtn.classList.remove("jarvis-stop-btn");
      scanBtn.textContent = "Scan Page";
      if (pickBtn) pickBtn.style.display = "none";
      stopPickFieldMode();
      document.getElementById("jarvis-people-list").style.display = peopleResults.length ? "block" : "none";
      updateAddAllButton();
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
    stopPickFieldMode();
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
  let pickFieldMode = false;
  let pickFieldHoverEl = null;
  const fieldElementRegistry = new Map();

  const SKIPPED_INPUT_TYPES = new Set(["hidden", "submit", "button", "reset", "image", "file"]);
  const FORM_INPUT_SELECTOR = [
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]):not([type="file"])',
    "textarea",
    "select",
    '[contenteditable="true"]',
    '[contenteditable=""]',
    '[role="textbox"]',
    '[role="combobox"]',
  ].join(", ");

  function getFieldKind(el) {
    if (!el) return "";
    if (el.tagName === "SELECT") return "select";
    if (el.tagName === "TEXTAREA") return "textarea";
    if (el.isContentEditable) return "contenteditable";
    const role = (el.getAttribute("role") || "").toLowerCase();
    if (role === "textbox" && el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") return "contenteditable";
    if (role === "combobox") return "combobox";
    if (el.tagName === "INPUT") return (el.type || "text").toLowerCase();
    return el.tagName.toLowerCase();
  }

  function isFormField(el) {
    if (!el || sidebarEl?.contains(el)) return false;
    const kind = getFieldKind(el);
    return kind && !SKIPPED_INPUT_TYPES.has(kind);
  }

  function findFormFieldFromNode(start) {
    let node = start;
    while (node && node !== document.body) {
      if (sidebarEl?.contains(node)) return null;
      if (isFormField(node)) return node;
      node = node.parentElement;
    }
    return null;
  }

  function findNearbyFormField(start) {
    let node = start;
    for (let i = 0; i < 6 && node && node !== document.body; i++) {
      if (sidebarEl?.contains(node)) return null;
      const matches = [...(node.querySelectorAll?.(FORM_INPUT_SELECTOR) || [])].filter(isFormField);
      if (matches.length === 1) return matches[0];
      const rich = node.querySelector?.('[contenteditable], textarea, [role="textbox"]');
      if (rich && isFormField(rich)) return rich;
      node = node.parentElement;
    }
    return null;
  }

  function resolveFormElement(target, clientX, clientY, opts = {}) {
    if (clientX != null && clientY != null && document.elementsFromPoint) {
      for (const el of document.elementsFromPoint(clientX, clientY)) {
        const found = findFormFieldFromNode(el);
        if (found) return found;
      }
    }
    const fromTarget = findFormFieldFromNode(target);
    if (fromTarget) return fromTarget;
    const inner = target?.querySelector?.(FORM_INPUT_SELECTOR);
    if (inner && isFormField(inner)) return inner;
    if (opts.allowNearby) return findNearbyFormField(target);
    return null;
  }

  function deepQuerySelector(selector, root = document) {
    try {
      const direct = root.querySelector?.(selector);
      if (direct) return direct;
    } catch { /* invalid selector in some roots */ }
    const nodes = root.querySelectorAll?.("*") || [];
    for (const node of nodes) {
      if (node.shadowRoot) {
        const found = deepQuerySelector(selector, node.shadowRoot);
        if (found) return found;
      }
    }
    return null;
  }

  function tagFieldElement(el) {
    if (!el) return "";
    if (!el.dataset.jarvisFieldId) {
      el.dataset.jarvisFieldId = `jf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    }
    fieldElementRegistry.set(el.dataset.jarvisFieldId, el);
    return el.dataset.jarvisFieldId;
  }

  function getFieldRect(el) {
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      left: Math.round(r.left),
      width: Math.round(r.width),
      height: Math.round(r.height),
    };
  }

  function rectsRoughlyMatch(a, b) {
    if (!a || !b) return false;
    return Math.abs(a.top - b.top) < 40 && Math.abs(a.left - b.left) < 60;
  }

  function refindFieldElement(field) {
    const candidates = collectFormElements();
    let best = null;
    let bestScore = 0;

    for (const el of candidates) {
      let score = 0;
      const kind = getFieldKind(el);
      if (field.fieldKind && kind === field.fieldKind) score += 3;
      if (field.jarvisFieldId && el.dataset.jarvisFieldId === field.jarvisFieldId) return el;

      const label = resolveFieldLabel(el);
      if (field.label && label && field.label === label) score += 4;
      else if (field.label && label && field.label.length > 10 && label.includes(field.label.slice(0, 20))) score += 2;

      if (field.fieldContext) {
        const ctx = getFieldContext(el);
        const a = field.fieldContext.slice(0, 120);
        const b = ctx.slice(0, 120);
        if (a && b && a === b) score += 5;
        else if (a && b && (ctx.includes(field.fieldContext.slice(0, 60)) || field.fieldContext.includes(ctx.slice(0, 60)))) score += 3;
      }

      if (field.fieldRect && rectsRoughlyMatch(field.fieldRect, getFieldRect(el))) score += 4;

      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }

    return bestScore >= 4 ? best : null;
  }

  function ensureFieldSelector(el) {
    const kind = getFieldKind(el);
    if (el.id) return `#${CSS.escape(el.id)}`;
    if (el.name && el.tagName !== "DIV") {
      const tag = el.tagName.toLowerCase();
      const typeAttr = kind !== "textarea" && kind !== "select" && kind !== "contenteditable" && el.tagName === "INPUT"
        ? `[type="${kind}"]` : "";
      return `${tag}${typeAttr}[name="${el.name}"]`;
    }
    const id = tagFieldElement(el);
    return `[data-jarvis-field-id="${id}"]`;
  }

  function collectFormElements() {
    const seen = new Set();
    const results = [];

    function add(el) {
      if (!el || seen.has(el) || !isFormField(el)) return;
      seen.add(el);
      results.push(el);
    }

    function scanRoot(root) {
      if (!root?.querySelectorAll) return;
      root.querySelectorAll(FORM_INPUT_SELECTOR).forEach(add);
      root.querySelectorAll("*").forEach(el => {
        if (el.shadowRoot) scanRoot(el.shadowRoot);
      });
    }

    scanRoot(document);
    return results;
  }

  function resolveFieldElement(field) {
    if (!field) return null;

    if (field.jarvisFieldId) {
      const cached = fieldElementRegistry.get(field.jarvisFieldId);
      if (cached && document.body.contains(cached)) return cached;
      const byId = deepQuerySelector(`[data-jarvis-field-id="${field.jarvisFieldId}"]`);
      if (byId) {
        fieldElementRegistry.set(field.jarvisFieldId, byId);
        return byId;
      }
    }

    if (field.selector) {
      let el = null;
      try { el = document.querySelector(field.selector); } catch { /* ignore */ }
      if (!el) el = deepQuerySelector(field.selector);
      if (el) {
        if (field.jarvisFieldId) fieldElementRegistry.set(field.jarvisFieldId, el);
        return el;
      }
    }

    if (field.name) {
      const el = deepQuerySelector(
        `input[name="${field.name}"], textarea[name="${field.name}"], select[name="${field.name}"]`
      );
      if (el) return el;
    }

    const refound = refindFieldElement(field);
    if (refound) {
      if (field.jarvisFieldId) {
        refound.dataset.jarvisFieldId = field.jarvisFieldId;
        fieldElementRegistry.set(field.jarvisFieldId, refound);
      } else {
        tagFieldElement(refound);
      }
    }
    return refound;
  }

  function getFieldContext(el) {
    const parts = [];
    const describedBy = el.getAttribute("aria-describedby");
    if (describedBy) {
      describedBy.split(/\s+/).forEach(id => {
        const node = document.getElementById(id);
        if (node?.textContent?.trim()) parts.push(node.textContent.trim());
      });
    }
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      labelledBy.split(/\s+/).forEach(id => {
        const node = document.getElementById(id);
        if (node?.textContent?.trim()) parts.push(node.textContent.trim());
      });
    }
    let prev = el.previousElementSibling;
    for (let i = 0; i < 4 && prev; i++) {
      const t = prev.textContent?.trim();
      if (t && t.length > 4) parts.unshift(t.slice(0, 300));
      prev = prev.previousElementSibling;
    }
    let container = el.parentElement;
    for (let i = 0; i < 6 && container; i++) {
      const clone = container.cloneNode(true);
      clone.querySelectorAll("input, textarea, select, button, script, style").forEach(n => n.remove());
      const text = clone.textContent?.replace(/\s+/g, " ").trim();
      if (text && text.length > 12) parts.push(text.slice(0, 400));
      container = container.parentElement;
    }
    return [...new Set(parts.filter(Boolean))].join("\n").slice(0, 900);
  }

  function pickBestQuestionLine(lines) {
    let best = "";
    let bestScore = 0;
    const generic = /^(textbox|text box|text field|field \d+|input|editable|rich text)$/i;
    for (const line of lines) {
      const t = line.trim();
      if (t.length < 10 || generic.test(t)) continue;
      let score = t.length;
      if (t.includes("?")) score += 60;
      if (/\b(describe|explain|what|how|why|please|tell us)\b/i.test(t)) score += 25;
      if (/\b(name|email|website|linkedin|title|company)\b/i.test(t) && t.length < 50) score += 30;
      if (score > bestScore) { bestScore = score; best = t; }
    }
    return best;
  }

  function resolveFieldLabel(el, idx = 0) {
    let label = "";
    if (el.id) {
      const labelEl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (labelEl) label = labelEl.textContent?.trim() || "";
    }
    if (!label) {
      const parent = el.parentElement;
      if (parent) {
        const labelEl = parent.querySelector("label");
        if (labelEl) label = labelEl.textContent?.trim() || "";
      }
    }
    if (!label) {
      let p = el.parentElement;
      for (let i = 0; i < 5 && p; i++) {
        const legend = p.querySelector("legend");
        const heading = p.querySelector("h1, h2, h3, h4, h5, h6");
        if (legend?.textContent?.trim()) { label = legend.textContent.trim(); break; }
        if (heading?.textContent?.trim()) { label = heading.textContent.trim(); break; }
        const span = p.querySelector("span, p");
        if (span?.textContent?.trim()) {
          label = span.textContent.trim().split("\n")[0].trim();
          break;
        }
        p = p.parentElement;
      }
    }
    if (!label) {
      label = el.placeholder || el.name || el.getAttribute("aria-label") || `Field ${idx}`;
    }

    const generic = /^(textbox|text box|text field|rich text|editable|input|field\s*\d*)$/i;
    if (generic.test(label.trim())) {
      const ctx = getFieldContext(el);
      const best = pickBestQuestionLine(ctx.split("\n"));
      if (best) label = best.slice(0, 200);
    }
    if (generic.test(label.trim())) {
      label = el.getAttribute("data-placeholder") || el.getAttribute("placeholder") || label;
    }

    return label.substring(0, 200);
  }

  function buildSelectorForElement(el) {
    return ensureFieldSelector(el);
  }

  function buildFieldFromElement(el, idx = 0, radioGroups = null, opts = {}) {
    const relaxed = !!opts.relaxed;
    const kind = getFieldKind(el);
    if (SKIPPED_INPUT_TYPES.has(kind)) return null;
    if (!isVisible(el, relaxed)) return null;

    if (kind === "radio") {
      const groupName = el.name || el.id;
      if (!groupName) return null;
      if (radioGroups && radioGroups[groupName]) return null;
      if (radioGroups) radioGroups[groupName] = true;

      let groupLabel = "";
      let p = el.parentElement;
      for (let i = 0; i < 6 && p; i++) {
        const legend = p.querySelector("legend");
        if (legend) { groupLabel = legend.textContent?.trim() || ""; break; }
        p = p.parentElement;
      }

      const radios = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(groupName)}"]`);
      const options = [];
      radios.forEach(r => {
        let optLabel = r.value;
        if (r.id) {
          const l = document.querySelector(`label[for="${CSS.escape(r.id)}"]`);
          if (l) optLabel = l.textContent?.trim() || r.value;
        }
        const parentLabel = r.closest("label");
        if (parentLabel) optLabel = parentLabel.textContent?.trim() || r.value;
        options.push(optLabel);
      });

      return {
        label: (groupLabel || resolveFieldLabel(el, idx) || groupName).substring(0, 200),
        type: "radio",
        fieldKind: "radio",
        selector: `input[type="radio"][name="${groupName}"]`,
        required: el.required || false,
        options,
        name: groupName,
        suggestedValue: "",
        fieldContext: getFieldContext(el),
      };
    }

    const options = [];
    if (el.tagName === "SELECT") {
      el.querySelectorAll("option").forEach(opt => { if (opt.value) options.push(opt.text); });
    }

    const fieldContext = getFieldContext(el);
    let label = resolveFieldLabel(el, idx);
    const generic = /^(textbox|text box|text field|field \d+|input|editable|rich text)$/i;
    if (generic.test(label.trim())) {
      const best = pickBestQuestionLine(fieldContext.split("\n"));
      if (best) label = best.slice(0, 200);
    }

    const selector = ensureFieldSelector(el);
    const jarvisFieldId = el.dataset.jarvisFieldId || tagFieldElement(el);
    const aiType = kind === "contenteditable" ? "textarea" : kind;

    return {
      label,
      type: aiType,
      fieldKind: kind,
      selector,
      jarvisFieldId,
      fieldRect: getFieldRect(el),
      required: el.required || el.getAttribute("aria-required") === "true" || false,
      options,
      name: el.name || "",
      suggestedValue: "",
      fieldContext,
    };
  }

  function extractFieldFromElement(el, opts = {}) {
    if (!el) return null;
    const resolved = isFormField(el) ? el : resolveFormElement(el);
    if (!resolved) {
      const nested = el.closest?.(FORM_INPUT_SELECTOR) || el.querySelector?.(FORM_INPUT_SELECTOR);
      if (!nested || !isFormField(nested)) return null;
      return buildFieldFromElement(nested, 0, null, { relaxed: true, ...opts });
    }
    return buildFieldFromElement(resolved, 0, null, { relaxed: true, ...opts });
  }

  function extractFormFields() {
    const fields = [];
    const radioGroups = {};

    collectFormElements().forEach((el, idx) => {
      const field = buildFieldFromElement(el, idx, radioGroups, { relaxed: true });
      if (field) fields.push(field);
    });

    return fields;
  }

  function clearPickFieldHighlight() {
    if (pickFieldHoverEl) {
      pickFieldHoverEl.classList.remove("jarvis-pick-hover");
      pickFieldHoverEl = null;
    }
  }

  function onPickFieldHover(e) {
    if (!pickFieldMode) return;
    const el = resolveFormElement(e.target, e.clientX, e.clientY, { allowNearby: true });
    if (el === pickFieldHoverEl) return;
    clearPickFieldHighlight();
    if (el) {
      pickFieldHoverEl = el;
      el.classList.add("jarvis-pick-hover");
    }
  }

  function onPickFieldClick(e) {
    if (!pickFieldMode) return;
    const el = resolveFormElement(e.target, e.clientX, e.clientY, { allowNearby: true });
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    stopPickFieldMode();
    analyzePickedField(el);
  }

  function onPickFieldKeydown(e) {
    if (!pickFieldMode) return;
    if (e.key === "Escape") {
      stopPickFieldMode();
      setStatus("Pick field cancelled");
    }
  }

  function togglePickFieldMode() {
    if (pickFieldMode) {
      stopPickFieldMode();
      setStatus("Pick field cancelled");
      return;
    }
    setMode("form");
    pickFieldMode = true;
    const btn = document.getElementById("jarvis-pick-field-btn");
    if (btn) {
      btn.classList.add("jarvis-pick-active");
      btn.textContent = "Cancel Pick";
    }
    setStatus("Click any form field on the page — text boxes, descriptions, rich editors… (Esc to cancel)");
    document.addEventListener("pointermove", onPickFieldHover, true);
    document.addEventListener("pointerdown", onPickFieldClick, true);
    document.addEventListener("keydown", onPickFieldKeydown, true);
  }

  function stopPickFieldMode() {
    if (!pickFieldMode) return;
    pickFieldMode = false;
    clearPickFieldHighlight();
    document.removeEventListener("pointermove", onPickFieldHover, true);
    document.removeEventListener("pointerdown", onPickFieldClick, true);
    document.removeEventListener("keydown", onPickFieldKeydown, true);
    const btn = document.getElementById("jarvis-pick-field-btn");
    if (btn) {
      btn.classList.remove("jarvis-pick-active");
      btn.textContent = "Pick Field";
    }
  }

  function mergeAnalyzedField(analyzed) {
    const cleaned = {
      ...analyzed,
      suggestedValue: sanitizeSuggestedValue(analyzed.suggestedValue || ""),
    };
    const idx = mappedFields.findIndex(f =>
      (f.jarvisFieldId && f.jarvisFieldId === cleaned.jarvisFieldId) ||
      f.selector === cleaned.selector ||
      (f.name && cleaned.name && f.name === cleaned.name)
    );
    if (idx >= 0) {
      const prev = mappedFields[idx];
      mappedFields[idx] = {
        ...prev,
        ...cleaned,
        label: cleaned.label && !/^(textbox|text box)$/i.test(cleaned.label) ? cleaned.label : prev.label,
        jarvisFieldId: prev.jarvisFieldId || cleaned.jarvisFieldId,
        fieldKind: prev.fieldKind || cleaned.fieldKind,
        selector: prev.selector || cleaned.selector,
        fieldRect: prev.fieldRect || cleaned.fieldRect,
        fieldContext: prev.fieldContext || cleaned.fieldContext,
      };
      return idx;
    }
    mappedFields.push(cleaned);
    return mappedFields.length - 1;
  }

  async function requestFieldAnalysis(fields, opts = {}) {
    const pageText = document.body.innerText.substring(0, 2000);
    const pageTitle = document.title;
    const timeoutMs = opts.timeoutMs || (fields.length === 1 ? 35000 : 25000);
    try {
      const timeoutPromise = new Promise(resolve =>
        setTimeout(() => resolve({ success: false, error: "Timed out" }), timeoutMs)
      );
      const apiPromise = sendMessage({
        type: "ANALYZE_FIELDS",
        fields,
        pageTitle,
        pageText,
        singleField: fields.length === 1,
      });
      return await Promise.race([apiPromise, timeoutPromise]);
    } catch {
      return { success: false, error: "Request failed" };
    }
  }

  async function analyzePickedField(el) {
    const field = extractFieldFromElement(el);
    if (!field) {
      setStatus("Could not read that field — try another");
      return;
    }

    setMode("form");
    setStatus(`Analyzing: ${field.label}…`);
    showLoading(true);
    document.getElementById("jarvis-fields-list").style.display = "none";

    const response = await requestFieldAnalysis([{ ...field, isRetry: true }]);
    showLoading(false);

    const analyzed = response.success && response.data?.fields?.[0]
      ? response.data.fields[0]
      : { ...field, suggestedValue: "" };

    const idx = mergeAnalyzedField(analyzed);
    renderFields(mappedFields, idx);
    document.getElementById("jarvis-fields-list").style.display = "block";
    showEmpty(false);

    if (analyzed.suggestedValue) {
      try {
        const ok = await fillSingleField(mappedFields[idx]);
        setStatus(ok
          ? `Filled "${mappedFields[idx].label}" — review on page`
          : `Answer ready for "${mappedFields[idx].label}" — use Fill Form or edit in sidebar`);
      } catch {
        setStatus(`Answer ready for "${field.label}" — click Fill on this field`);
      }
    } else {
      setStatus(`No auto-answer for "${field.label}" — edit in sidebar or retry`);
    }
  }

  async function fillSingleField(field) {
    if (!field?.suggestedValue) return false;
    let ok = false;
    if (field.type === "radio") ok = await fillRadio(field);
    else if (field.type === "select" || field.type === "select-one") ok = await fillSelect(field);
    else if (field.type === "checkbox") ok = await fillCheckbox(field);
    else ok = await fillText(field);

    const el = resolveFieldElement(field);
    if (el && ok) {
      const origOutline = el.style.outline;
      el.style.outline = "2px solid #3b82f6";
      el.style.borderRadius = "3px";
      setTimeout(() => { el.style.outline = origOutline; }, 2500);
    }
    return ok;
  }

  function isVisible(el, relaxed = false) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (!relaxed && parseFloat(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return true;
    if (relaxed) {
      if (el.isContentEditable || el.getAttribute("role") === "textbox") {
        const parentRect = el.parentElement?.getBoundingClientRect();
        if (parentRect && parentRect.width > 0 && parentRect.height > 0) return true;
      }
      // Styled custom controls often hide the real input with opacity:0
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
        const parentRect = el.parentElement?.getBoundingClientRect();
        if (parentRect && parentRect.width > 20 && parentRect.height > 8) return true;
      }
    }
    return el.tagName === "TEXTAREA";
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

    const response = await requestFieldAnalysis(fields);

    if (response.success && response.data?.fields) {
      mappedFields = sanitizeMappedFields(response.data.fields);
      setStatus(`Ready — ${mappedFields.filter(f => f.suggestedValue).length}/${mappedFields.length} fields filled by AI`);
    } else {
      // Fall back: show fields with empty values user can fill manually
      mappedFields = fields;
      setStatus(`${fields.length} fields found${response.error ? ` (${response.error})` : ""} — fill manually or retry`);
    }

    showLoading(false);
    renderFields(mappedFields);
  }

  function renderFields(fields, highlightIdx = -1) {
    const list = document.getElementById("jarvis-fields-list");
    list.innerHTML = "";
    showEmpty(false);
    list.style.display = "block";

    fields.forEach((field, idx) => {
      const item = document.createElement("div");
      item.className = "jarvis-field-item" + (idx === highlightIdx ? " jarvis-field-highlight" : "");

      const hasValue = !!(field.suggestedValue || "").trim();
      const labelRow = `
        <div class="jarvis-field-label">
          <span>${field.label}</span>
          ${field.required ? '<span class="jarvis-field-required">*</span>' : ""}
          <span class="jarvis-field-type">${field.type}</span>
          ${!hasValue ? '<span class="jarvis-field-type" style="color:#f87171">empty</span>' : ""}
        </div>
      `;

      let input = "";
      if (field.type === "textarea" || (field.suggestedValue || "").length > 100) {
        input = `<textarea rows="3" data-idx="${idx}">${field.suggestedValue || ""}</textarea>`;
      } else if (field.options && field.options.length > 0) {
        const opts = field.options.map(o =>
          `<option value="${o}" ${o === field.suggestedValue ? "selected" : ""}>${o}</option>`
        ).join("");
        input = `<select data-idx="${idx}"><option value="">-- select --</option>${opts}</select>`;
      } else {
        input = `<input type="text" value="${(field.suggestedValue || "").replace(/"/g, "&quot;")}" data-idx="${idx}" />`;
      }

      item.innerHTML = labelRow + input;
      list.appendChild(item);

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

    if (highlightIdx >= 0) {
      list.children[highlightIdx]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
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
    contactsAdded = false;

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
      updateAddAllButton();
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

  function formatPersonEmails(person) {
    const emails = person.emails?.length ? person.emails : (person.email ? [person.email] : []);
    if (emails.length === 0) return `<span class="jarvis-email-missing">Not found</span>`;

    const primary = emails[0];
    const extra = emails.length > 1
      ? `<span class="jarvis-email-extra" title="${emails.slice(1).join(", ")}">+${emails.length - 1} more</span>`
      : "";

    return `<span class="jarvis-email-found" title="${emails.join(", ")}">${primary}</span>
           ${extra}
           <button class="jarvis-copy-btn" data-email="${primary}" data-all-emails="${emails.join(", ")}">Copy</button>
           <button class="jarvis-sent-btn${person.emailed || emailedPeople.has(primary) ? " jarvis-sent-done" : ""}" data-name="${person.name.replace(/"/g, "&quot;")}" data-email="${primary}" data-emails="${emails.join(", ")}" data-title="${(person.title || "").replace(/"/g, "&quot;")}" ${person.emailed || emailedPeople.has(primary) ? "disabled" : ""}>${person.emailed || emailedPeople.has(primary) ? "Sent ✓" : "Mark Sent"}</button>`;
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

      const emailHtml = formatPersonEmails(person);

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
          const text = copyBtn.dataset.allEmails || copyBtn.dataset.email;
          navigator.clipboard.writeText(text);
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
        emails: person.emails || (person.email ? [person.email] : []),
        title: person.title || "",
        company: detectedCompany || "",
        pageUrl: window.location.href,
        audience: sendAudience,
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
    const emails = peopleResults.flatMap(p => {
      if (p.emails?.length) return p.emails;
      return p.email ? [p.email] : [];
    });
    const unique = [...new Set(emails)];
    if (unique.length === 0) {
      setStatus("No emails to copy — scan the page first");
      return;
    }
    navigator.clipboard.writeText(unique.join(", "));
    setStatus(`Copied ${unique.length} emails to clipboard`);
  }

  async function addAllToContacts() {
    const withEmail = peopleResults.filter(p => p.email);
    if (withEmail.length === 0) {
      setStatus("No emails to add — scan the page first");
      return;
    }

    const btn = document.getElementById("jarvis-add-all-btn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Saving...";
    }
    setStatus(`Adding ${withEmail.length} contacts to Jarvis...`);

    try {
      const response = await chrome.runtime.sendMessage({
        type: "ADD_CONTACTS",
        contacts: withEmail.map(p => ({
          name: p.name,
          email: p.email,
          emails: p.emails || (p.email ? [p.email] : []),
          title: p.title || "",
          company: detectedCompany || "",
        })),
        company: detectedCompany || "",
        pageUrl: window.location.href,
      });

      if (response?.success) {
        contactsAdded = true;
        updateAddAllButton();
        setStatus(response.message || `Added ${withEmail.length} contacts`);
      } else {
        if (btn) {
          btn.disabled = false;
          updateAddAllButton();
        }
        setStatus(response?.error || "Failed to add contacts");
      }
    } catch {
      if (btn) {
        btn.disabled = false;
        updateAddAllButton();
      }
      setStatus("Failed to save — check Jarvis login in extension popup");
    }
  }

  // ── Gmail send mode ────────────────────────────────────────────────────────

  function interpolateTemplate(text, person) {
    const firstName = (person.name || "").split(/\s+/)[0] || person.name || "";
    let result = (text || "")
      .replace(/\{\{firstName\}\}/gi, firstName)
      .replace(/\{\{name\}\}/gi, person.name || "")
      .replace(/\{\{company\}\}/gi, person.company || "")
      .replace(/\{\{email\}\}/gi, person.email || "");
    result = personalizeGreeting(result, firstName);
    return result;
  }

  /** Insert investor first name into "Hello," → "Hello Mark," */
  function personalizeGreeting(text, firstName) {
    if (!firstName || !text) return text;
    if (new RegExp(`Hello\\s+${firstName}\\b`, "i").test(text)) return text;
    return text.replace(/\bHello\b(\s*,)?/i, (_, comma) => `Hello ${firstName}${comma || ","}`);
  }

  function getContactEmail(c) {
    if (c.email?.includes("@")) return c.email.trim().toLowerCase();
    const found = (c.emails || []).find(e => e?.includes("@"));
    return found ? found.trim().toLowerCase() : "";
  }

  async function markPersonAsSent(person) {
    const payload = {
      type: "MARK_EMAILED",
      id: person.id,
      name: person.name,
      email: (person.email || "").trim().toLowerCase(),
      emails: person.emails?.length ? person.emails : (person.email ? [person.email] : []),
      title: person.title || "",
      company: person.company || "",
      pageUrl: window.location.href,
      audience: sendAudience,
    };

    let lastError = "Failed to mark contact as sent in Jarvis";
    for (let attempt = 0; attempt < 3; attempt++) {
      const markRes = await sendMessage(payload);
      if (markRes?.success) return;
      lastError = markRes?.error || lastError;
      await sleep(600);
    }
    throw new Error(lastError);
  }

  async function loadOutreachQueue(audience = sendAudience) {
    if (!window.__jarvisGmail?.isGmail()) {
      setStatus("Open Gmail to use Send Emails mode");
      return;
    }

    sendAudience = audience;
    initDefaultTemplate(audience);
    showLoading(true);
    showEmpty(false);

    const queueRes = await sendMessage({ type: "GET_OUTREACH_QUEUE", audience });

    showLoading(false);

    let rawList = [];

    if (queueRes.success && Array.isArray(queueRes.data?.recipients)) {
      rawList = queueRes.data.recipients;
    } else {
      // Fallback if outreach-queue API fails
      const contactsRes = await sendMessage({ type: "GET_CONTACTS" });
      if (contactsRes.success && Array.isArray(contactsRes.data)) {
        rawList = contactsRes.data
          .filter(c => {
            const email = getContactEmail(c);
            if (!email || c.emailSent === true) return false;
            return matchesAudienceFilter(c, audience);
          })
          .map(c => ({
            id: c.id,
            type: "contact",
            name: c.name || "",
            email: getContactEmail(c),
            emails: c.emails || (c.email?.includes("@") ? [c.email] : []),
            source: c.source || "",
            company: c.company || "",
            title: c.title || "",
          }));
      }
    }

    if (!queueRes.success && !rawList.length) {
      setStatus(queueRes.error || "Failed to load contacts — log in via extension popup");
      showEmpty(true);
      document.getElementById("jarvis-empty-text").textContent = queueRes.error || "Could not load contacts from Jarvis";
      renderSendPanel();
      return;
    }

    outreachQueue = rawList.map(r => ({
      ...r,
      selected: true,
      sent: false,
    }));

    renderSendPanel();

    if (!outreachQueue.length) {
      setStatus(audienceQueueHint(audience));
    } else {
      const scanned = queueRes.data?.scanned;
      const scanNote = scanned ? ` · scanned ${scanned} contacts` : "";
      const ccNote = sendTemplate.cc ? ` · CC: ${sendTemplate.cc}` : "";
      setStatus(`${outreachQueue.length} ${audienceListLabel(audience)} ready${ccNote}${scanNote}`);
    }
  }

  async function removeFromQueue(idx) {
    const person = outreachQueue[idx];
    if (!person || person.sent) return;
    if (!confirm(`Remove ${person.name} (${person.email}) from this list?${person.id ? " They will be deleted from Jarvis Contacts." : ""}`)) return;

    if (person.id) {
      const res = await sendMessage({ type: "DELETE_CONTACT", id: person.id });
      if (!res?.success) {
        setStatus(res?.error || "Failed to delete contact");
        return;
      }
    }

    outreachQueue.splice(idx, 1);
    renderSendPanel();
    setStatus(`Removed ${person.name} from send list`);
  }

  function renderSendPanel() {
    const panel = document.getElementById("jarvis-send-panel");
    if (!panel) return;

    showEmpty(false);
    panel.style.display = "block";

    const selectedCount = outreachQueue.filter(p => p.selected && !p.sent).length;

    const audienceLabelText = audienceLabel(sendAudience);
    const ccLine = sendTemplate.cc ? ` · CC: ${escapeHtml(sendTemplate.cc)}` : "";

    panel.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">
        <div style="display:flex;gap:6px">
          <button type="button" id="jarvis-audience-investor" class="jarvis-audience-btn${sendAudience === "investor" ? " jarvis-audience-active" : ""}">Investors</button>
          <button type="button" id="jarvis-audience-journalist" class="jarvis-audience-btn${sendAudience === "journalist" ? " jarvis-audience-active" : ""}">Journalists</button>
        </div>
        <div style="display:flex;gap:6px">
          <button type="button" id="jarvis-audience-sd-b2c" class="jarvis-audience-btn${sendAudience === "swiftdroom-b2c" ? " jarvis-audience-active" : ""}">SD Users</button>
          <button type="button" id="jarvis-audience-sd-b2b" class="jarvis-audience-btn${sendAudience === "swiftdroom-b2b" ? " jarvis-audience-active" : ""}">SD Partners</button>
        </div>
      </div>
      <div style="margin-bottom:12px">
        <p style="font-size:10px;color:#34d399;margin:0 0 8px">✓ ${audienceLabelText} loaded${ccLine}</p>
        <input id="jarvis-send-subject" class="jarvis-template-input" placeholder="Subject" value="${escapeHtml(sendTemplate.subject)}" style="margin-bottom:6px" />
        <textarea id="jarvis-send-body" class="jarvis-template-input jarvis-template-body" placeholder="Email body...">${escapeHtml(sendTemplate.body)}</textarea>
      </div>
      <div style="margin-bottom:12px;padding:10px;border:1px solid #262626;border-radius:8px;background:#111">
        <p style="font-size:10px;color:#737373;margin:0 0 8px;font-weight:600">Test send (won't mark contacts as sent)</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${TEST_EMAILS.map(t => `<button type="button" class="jarvis-test-btn" data-test-email="${escapeHtml(t.email)}">Test → ${escapeHtml(t.label)}</button>`).join("")}
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <p style="font-size:11px;color:#a3a3a3;margin:0;font-weight:600">Recipients (${selectedCount} selected)</p>
        <button id="jarvis-select-all" style="font-size:10px;background:none;border:none;color:#737373;cursor:pointer">Toggle all</button>
      </div>
      <div id="jarvis-send-list"></div>
    `;

    document.getElementById("jarvis-audience-investor").addEventListener("click", () => loadOutreachQueue("investor"));
    document.getElementById("jarvis-audience-journalist").addEventListener("click", () => loadOutreachQueue("journalist"));
    document.getElementById("jarvis-audience-sd-b2c").addEventListener("click", () => loadOutreachQueue("swiftdroom-b2c"));
    document.getElementById("jarvis-audience-sd-b2b").addEventListener("click", () => loadOutreachQueue("swiftdroom-b2b"));

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

    panel.querySelectorAll(".jarvis-test-btn").forEach(btn => {
      btn.addEventListener("click", () => sendTestEmail(btn.dataset.testEmail, btn));
    });

    const list = document.getElementById("jarvis-send-list");
    if (!outreachQueue.length) {
      list.innerHTML = `<p style="font-size:12px;color:#525252;text-align:center;padding:20px 0">No contacts with email (not sent yet).<br><span style="font-size:11px;color:#404040">Use test buttons above first, then import contacts in Jarvis.</span></p>`;
      updateSendActionLabel();
      return;
    }

    outreachQueue.forEach((person, idx) => {
      const item = document.createElement("div");
      item.className = `jarvis-send-item${person.sent ? " jarvis-send-done" : ""}`;
      item.innerHTML = `
        <input type="checkbox" ${person.selected ? "checked" : ""} ${person.sent ? "disabled" : ""} data-idx="${idx}" />
        <div style="min-width:0;flex:1">
          <p style="font-size:12px;font-weight:600;color:#e5e5e5;margin:0">${escapeHtml(person.name)}</p>
          <p style="font-size:10px;color:#525252;margin:2px 0 0">${escapeHtml(person.email)}${person.company ? ` · ${escapeHtml(person.company)}` : ""}</p>
          <span style="font-size:9px;color:#404040">${person.source || audienceListLabel(sendAudience).replace(/s$/, "")}${person.sent ? " · sent ✓" : ""}</span>
        </div>
        ${person.sent ? "" : `<button type="button" class="jarvis-send-delete" data-remove-idx="${idx}" title="Remove from list">✕</button>`}
      `;
      const cb = item.querySelector("input");
      cb.addEventListener("change", () => {
        outreachQueue[idx].selected = cb.checked;
        updateSendActionLabel();
      });
      const delBtn = item.querySelector(".jarvis-send-delete");
      if (delBtn) {
        delBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          removeFromQueue(idx);
        });
      }
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

  function syncTemplateFromForm() {
    sendTemplate.subject = document.getElementById("jarvis-send-subject")?.value || sendTemplate.subject;
    sendTemplate.body = document.getElementById("jarvis-send-body")?.value || sendTemplate.body;
  }

  async function deliverEmail(person, { markSent = true } = {}) {
    const firstName = (person.name || "").split(/\s+/)[0] || "there";
    const subject = interpolateTemplate(sendTemplate.subject, person);
    const tpl = getActiveTemplate();
    const usePlainOnly = tpl?.plainTextOnly === true;
    const bodyHtml = usePlainOnly ? null : (tpl?.buildHtml ? tpl.buildHtml(firstName) : null);
    const body = tpl?.buildPlain
      ? tpl.buildPlain(firstName)
      : interpolateTemplate(sendTemplate.body, person);

    await window.__jarvisGmail.sendOneEmail({
      to: person.email,
      cc: sendTemplate.cc || undefined,
      subject,
      body,
      bodyHtml,
    });

    if (markSent) {
      await markPersonAsSent(person);
    }
  }

  async function sendTestEmail(email, btn) {
    if (sendQueueRunning) { setStatus("Wait — bulk send in progress"); return; }
    const test = TEST_EMAILS.find(t => t.email === email);
    if (!test) return;

    syncTemplateFromForm();
    if (!sendTemplate.subject.trim()) { setStatus("Subject is required"); return; }

    if (btn) { btn.disabled = true; btn.textContent = "Sending..."; }

    try {
      setStatus(`Test send → ${test.email}...`);
      await deliverEmail(test, { markSent: false });
      setStatus(`Test sent to ${test.email} — check inbox & formatting`);
    } catch (err) {
      setStatus(`Test failed: ${err.message || err}`);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = `Test → ${test.label}`;
      }
    }
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
        syncTemplateFromForm();
        await deliverEmail(person, { markSent: true });

        person.sent = true;
        person.selected = false;
        sent++;

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
    const missed = [];

    for (const field of mappedFields) {
      if (!field.suggestedValue) continue;

      const el = resolveFieldElement(field);
      if (el) {
        if (field.jarvisFieldId) {
          el.dataset.jarvisFieldId = field.jarvisFieldId;
          fieldElementRegistry.set(field.jarvisFieldId, el);
        }
        field.fieldRect = getFieldRect(el);
      }

      try {
        const ok = await fillSingleField(field);
        if (ok) filled++;
        else {
          failed++;
          missed.push(field.label || "unknown field");
        }
      } catch {
        failed++;
        missed.push(field.label || "unknown field");
      }

      const isRich = field.fieldKind === "contenteditable" || field.type === "textarea" || field.type === "textbox";
      await sleep(isRich ? 450 : 120);
    }

    if (missed.length) {
      setStatus(`Filled ${filled} fields — ${failed} could not be placed (${missed.slice(0, 2).join(", ")}${missed.length > 2 ? "…" : ""}). Try Pick Field on those.`);
    } else {
      setStatus(`Filled ${filled} fields — review and submit!`);
    }
  }

  async function fillRadio(field) {
    const val = field.suggestedValue.toLowerCase().trim();
    let radios = document.querySelectorAll(`input[type="radio"][name="${field.name}"]`);
    if (!radios.length) {
      const one = deepQuerySelector(`input[type="radio"][name="${field.name}"]`);
      radios = one ? [one] : [];
    }

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
        return true;
      }
    }
    return false;
  }

  async function fillSelect(field) {
    const el = resolveFieldElement(field);
    if (!el || !isVisible(el, true)) return false;
    const val = field.suggestedValue;
    for (const opt of el.options) {
      if (opt.text === val || opt.value === val || opt.text.toLowerCase().includes(val.toLowerCase())) {
        el.value = opt.value;
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
    }
    return false;
  }

  async function fillCheckbox(field) {
    const el = resolveFieldElement(field);
    if (!el || !isVisible(el, true)) return false;
    const checked = ["true", "yes", "1"].includes(field.suggestedValue.toLowerCase());
    el.checked = checked;
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function getEditableTarget(el) {
    if (!el) return null;
    if (el.isContentEditable) return el;
    const inner = el.querySelector('[contenteditable="true"], [contenteditable=""]');
    return inner || el;
  }

  function readFieldText(el) {
    if (!el) return "";
    const target = getEditableTarget(el);
    return (target?.innerText || target?.textContent || el.value || "").replace(/\s+/g, " ").trim();
  }

  function fieldHasText(el, value) {
    const current = readFieldText(el);
    const sample = value.trim().replace(/\s+/g, " ").slice(0, Math.min(40, value.length));
    return sample.length > 0 && current.includes(sample);
  }

  function setNativeValue(el, value) {
    if (!el) return false;
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return fieldHasText(el, value);
  }

  function findAssociatedNativeInput(editableEl) {
    if (!editableEl) return null;
    let node = editableEl;
    for (let i = 0; i < 10 && node; i++) {
      const textareas = node.querySelectorAll?.("textarea") || [];
      for (const ta of textareas) {
        if (ta !== editableEl) return ta;
      }
      const inputs = node.querySelectorAll?.('input[type="text"], input:not([type])') || [];
      for (const inp of inputs) {
        if (inp !== editableEl && inp.type !== "hidden" && inp.type !== "checkbox" && inp.type !== "radio") {
          return inp;
        }
      }
      node = node.parentElement;
    }
    return null;
  }

  async function tryPasteInto(el, text) {
    el.focus();
    try { document.execCommand("selectAll", false, null); } catch { /* ignore */ }

    try {
      const dt = new DataTransfer();
      dt.setData("text/plain", text);
      el.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: dt }));
      if (fieldHasText(el, text)) return true;
    } catch { /* ignore */ }

    try {
      document.execCommand("insertText", false, text);
      return fieldHasText(el, text);
    } catch { /* ignore */ }

    return false;
  }

  async function fillContentEditable(el, value) {
    const target = getEditableTarget(el);
    if (!target) return false;

    const checkSuccess = () => fieldHasText(target, value) || fieldHasText(el, value);
    if (checkSuccess()) return true;

    target.focus();
    await sleep(60);

    // Many React forms keep a hidden/native textarea as source of truth — fill that first
    const native = findAssociatedNativeInput(target);
    if (native) {
      setNativeValue(native, value);
      await sleep(100);
      if (checkSuccess()) return true;
    }

    if (await tryPasteInto(target, value)) return true;
    await sleep(150);
    if (checkSuccess()) return true;

    try {
      const existing = readFieldText(target);
      if (existing) {
        document.execCommand("selectAll", false, null);
        document.execCommand("delete", false, null);
        await sleep(30);
      }
      document.execCommand("insertText", false, value);
    } catch { /* ignore */ }

    await sleep(150);
    if (checkSuccess()) return true;

    if (native) {
      setNativeValue(native, value);
      await sleep(100);
    }

    // Do not blur — blur often triggers React/Lexical to revert unsynced DOM changes
    return checkSuccess();
  }

  async function fillText(field) {
    const el = resolveFieldElement(field);
    if (!el) return false;
    const kind = field.fieldKind || getFieldKind(el);
    if (kind === "contenteditable" || el.isContentEditable || el.getAttribute("role") === "textbox") {
      return fillContentEditable(el, field.suggestedValue);
    }
    if (!isVisible(el, true)) return false;
    el.focus();
    await sleep(30);
    const ok = setNativeValue(el, field.suggestedValue);
    await sleep(50);
    return ok || fieldHasText(el, field.suggestedValue);
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
