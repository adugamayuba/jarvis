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
            Scanning page for forms...
          </p>
        </div>

        <!-- Main content -->
        <div id="jarvis-content" style="flex: 1; overflow-y: auto; padding: 12px 16px;">
          <div id="jarvis-loading" style="text-align: center; padding: 40px 0;">
            <div class="jarvis-spinner"></div>
            <p style="font-size: 12px; color: #525252; margin-top: 12px;">Analyzing form fields...</p>
          </div>
          <div id="jarvis-fields-list" style="display: none;"></div>
          <div id="jarvis-empty" style="display: none; text-align: center; padding: 40px 0;">
            <p style="font-size: 12px; color: #525252;">No form fields detected on this page.</p>
            <p style="font-size: 11px; color: #404040; margin-top: 4px;">Navigate to an application form to get started.</p>
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
          ">Scan Again</button>
          <button id="jarvis-fill-btn" style="
            flex: 2; background: #fff; color: #0a0a0a; border: none;
            border-radius: 7px; padding: 8px; font-size: 12px; font-weight: 600;
            cursor: pointer; transition: all 0.15s; display: flex;
            align-items: center; justify-content: center; gap: 6px;
          ">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            Fill Form
          </button>
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
    `;
    document.head.appendChild(style);
    document.body.appendChild(container);
    sidebarEl = container;

    // Events
    document.getElementById("jarvis-close-btn").addEventListener("click", closeSidebar);
    document.getElementById("jarvis-toggle-tab").addEventListener("click", toggleSidebar);
    document.getElementById("jarvis-scan-btn").addEventListener("click", scanAndMap);
    document.getElementById("jarvis-fill-btn").addEventListener("click", fillForm);
  }

  function openSidebar() {
    createSidebar();
    sidebarOpen = true;
    document.getElementById("jarvis-sidebar").style.right = "0";
    document.getElementById("jarvis-toggle-tab").style.right = "400px";
  }

  function closeSidebar() {
    if (!sidebarEl) return;
    sidebarOpen = false;
    document.getElementById("jarvis-sidebar").style.right = "-420px";
    document.getElementById("jarvis-toggle-tab").style.right = "0";
  }

  function toggleSidebar() {
    if (sidebarOpen) closeSidebar(); else openSidebar();
  }

  // ── Form scanning ──────────────────────────────────────────────────────────

  let mappedFields = [];

  function extractFormFields() {
    const fields = [];
    const radioGroups = {};
    const inputs = document.querySelectorAll("input, textarea, select");

    inputs.forEach((el, idx) => {
      const type = el.type || el.tagName.toLowerCase();
      if (["hidden", "submit", "button", "reset", "image", "file"].includes(type)) return;

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
      if (!label) label = el.placeholder || el.name || `Field ${idx}`;

      if (type === "radio") {
        const groupName = el.name || el.id;
        if (!groupName || radioGroups[groupName]) return;
        radioGroups[groupName] = true;

        // Find group label
        let groupLabel = "";
        let p = el.parentElement;
        for (let i = 0; i < 6 && p; i++) {
          const legend = p.querySelector("legend");
          if (legend) { groupLabel = legend.textContent?.trim() || ""; break; }
          p = p.parentElement;
        }

        // Collect options
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
          selector: `[name="${groupName}"]`,
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

      const selector = el.id ? `#${el.id}` : (el.name ? `[name="${el.name}"]` : `${el.tagName.toLowerCase()}:nth-of-type(${idx + 1})`);
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
    openSidebar();
    setStatus("Scanning form fields...");
    showLoading(true);
    document.getElementById("jarvis-fields-list").style.display = "none";
    showEmpty(false);

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
    const el = document.querySelector(field.selector);
    if (!el) return;
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
    const el = document.querySelector(field.selector);
    if (!el) return;
    const checked = ["true", "yes", "1"].includes(field.suggestedValue.toLowerCase());
    el.checked = checked;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function fillText(field) {
    const el = document.querySelector(field.selector);
    if (!el) return;
    // Clear and fill
    el.focus();
    el.value = "";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    // Type character by character for React-controlled inputs
    for (const char of field.suggestedValue) {
      el.value += char;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(10);
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
      openSidebar();
      if (msg.autoScan) scanAndMap();
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
