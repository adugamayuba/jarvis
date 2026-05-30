const DEFAULT_API = "https://jarvis-production-42ed.up.railway.app";

async function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (r) => resolve(r || {}));
  });
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function init() {
  const { token, role } = await sendMsg({ type: "GET_TOKEN" });
  const { apiBase } = await chrome.storage.local.get("apiBase");

  if (!token) {
    document.getElementById("login-view").style.display = "block";
    const saved = apiBase || DEFAULT_API;
    document.getElementById("api-base-input").value = saved;
  } else {
    document.getElementById("main-view").style.display = "block";
    document.getElementById("api-base-display").value = apiBase || DEFAULT_API;
  }
}

// Login
document.getElementById("login-btn")?.addEventListener("click", async () => {
  const pw = document.getElementById("password-input").value;
  const errEl = document.getElementById("login-error");
  errEl.style.display = "none";

  if (!pw) { errEl.textContent = "Enter a password"; errEl.style.display = "block"; return; }

  // Save API base first
  const apiBase = document.getElementById("api-base-input").value.trim() || DEFAULT_API;
  await sendMsg({ type: "SET_API_BASE", apiBase });

  const res = await sendMsg({ type: "LOGIN", password: pw });
  if (res.success) {
    document.getElementById("login-view").style.display = "none";
    document.getElementById("main-view").style.display = "block";
    document.getElementById("api-base-display").value = apiBase;
  } else {
    errEl.textContent = res.error || "Invalid password";
    errEl.style.display = "block";
  }
});

document.getElementById("password-input")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("login-btn").click();
});

document.getElementById("save-api-btn")?.addEventListener("click", async () => {
  const apiBase = document.getElementById("api-base-input").value.trim();
  if (apiBase) await sendMsg({ type: "SET_API_BASE", apiBase });
});

// Open sidebar
document.getElementById("open-sidebar-btn")?.addEventListener("click", async () => {
  const tab = await getActiveTab();
  await chrome.tabs.sendMessage(tab.id, { type: "OPEN_SIDEBAR" });
  window.close();
});

// Scan + auto-fill
document.getElementById("scan-fill-btn")?.addEventListener("click", async () => {
  const tab = await getActiveTab();
  await chrome.tabs.sendMessage(tab.id, { type: "OPEN_SIDEBAR", autoScan: true });
  window.close();
});

// Update API base
document.getElementById("update-api-btn")?.addEventListener("click", async () => {
  const apiBase = document.getElementById("api-base-display").value.trim();
  if (apiBase) {
    await sendMsg({ type: "SET_API_BASE", apiBase });
    document.getElementById("api-base-display").style.borderColor = "#22c55e";
    setTimeout(() => { document.getElementById("api-base-display").style.borderColor = ""; }, 1500);
  }
});

// Logout
document.getElementById("logout-btn")?.addEventListener("click", async () => {
  await chrome.storage.local.remove(["token", "role"]);
  document.getElementById("main-view").style.display = "none";
  document.getElementById("login-view").style.display = "block";
});

init();
