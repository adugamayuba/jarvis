const DEFAULT_API = "https://jarvis-production-42ed.up.railway.app";

// Wake up service worker before sending messages
async function sendMsg(msg) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(msg, (r) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(r || { success: false, error: "No response from background" });
        }
      });
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function showError(msg) {
  const el = document.getElementById("login-error");
  if (!el) return;
  el.textContent = msg;
  el.style.display = "block";
}

function hideError() {
  const el = document.getElementById("login-error");
  if (el) el.style.display = "none";
}

async function init() {
  const res = await sendMsg({ type: "GET_TOKEN" });
  const token = res?.token || "";
  const stored = await chrome.storage.local.get("apiBase");
  const apiBase = stored.apiBase || DEFAULT_API;

  if (!token) {
    show("login-view");
    setValue("api-base-input", apiBase);
  } else {
    show("main-view");
    setValue("api-base-display", apiBase);
  }
}

function show(id) {
  ["login-view", "main-view"].forEach(v => {
    const el = document.getElementById(v);
    if (el) el.style.display = v === id ? "block" : "none";
  });
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function getValue(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

// ── Login ────────────────────────────────────────────────────────────────────
document.getElementById("login-btn")?.addEventListener("click", async () => {
  hideError();
  const pw = getValue("password-input");
  const rawUrl = getValue("api-base-input");

  if (!pw) { showError("Enter a password"); return; }
  if (!rawUrl) { showError("Enter your Railway backend URL"); return; }

  const apiBase = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

  // Save URL first
  await sendMsg({ type: "SET_API_BASE", apiBase });

  const btn = document.getElementById("login-btn");
  btn.textContent = "Signing in...";
  btn.disabled = true;

  const res = await sendMsg({ type: "LOGIN", password: pw });
  btn.textContent = "Sign in";
  btn.disabled = false;

  if (res.success) {
    show("main-view");
    setValue("api-base-display", apiBase);
  } else {
    const errMsg = res.error || "Login failed";
    if (errMsg.includes("fetch") || errMsg.includes("network") || errMsg.includes("Failed")) {
      showError(`Cannot reach backend at:\n${apiBase}\n\nMake sure Railway is running and the URL is correct.`);
    } else {
      showError(errMsg);
    }
  }
});

document.getElementById("password-input")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("login-btn")?.click();
});

document.getElementById("test-btn")?.addEventListener("click", async () => {
  hideError();
  const rawUrl = getValue("api-base-input");
  if (!rawUrl) { showError("Enter a URL first"); return; }
  const apiBase = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  await sendMsg({ type: "SET_API_BASE", apiBase });

  const btn = document.getElementById("test-btn");
  btn.textContent = "Testing...";
  btn.disabled = true;

  const res = await sendMsg({ type: "TEST_CONNECTION" });
  btn.textContent = "Test";
  btn.disabled = false;

  if (res.success) {
    showError("✅ Backend reachable!");
    document.getElementById("login-error").style.color = "#22c55e";
  } else {
    showError(`❌ ${res.error || "Cannot reach backend"}`);
  }
});

// ── Main view ────────────────────────────────────────────────────────────────
document.getElementById("open-sidebar-btn")?.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab?.id) return;
  await chrome.tabs.sendMessage(tab.id, { type: "OPEN_SIDEBAR" }).catch(() => {});
  window.close();
});

document.getElementById("scan-fill-btn")?.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab?.id) return;
  await chrome.tabs.sendMessage(tab.id, { type: "OPEN_SIDEBAR", autoScan: true }).catch(() => {});
  window.close();
});

document.getElementById("update-api-btn")?.addEventListener("click", async () => {
  const apiBase = getValue("api-base-display");
  if (!apiBase) return;
  await sendMsg({ type: "SET_API_BASE", apiBase });
  const el = document.getElementById("api-base-display");
  if (el) { el.style.borderColor = "#22c55e"; setTimeout(() => { el.style.borderColor = ""; }, 1500); }
});

document.getElementById("logout-btn")?.addEventListener("click", async () => {
  await chrome.storage.local.remove(["token", "role"]);
  show("login-view");
  const stored = await chrome.storage.local.get("apiBase");
  setValue("api-base-input", stored.apiBase || DEFAULT_API);
});

init();
