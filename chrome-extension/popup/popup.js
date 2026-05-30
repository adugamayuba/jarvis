const DEFAULT_API = "https://jarvis-production-42ed.up.railway.app";

async function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (r) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(r || { success: false, error: "No response from background" });
      }
    });
  });
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function showError(msg) {
  const el = document.getElementById("login-error");
  el.textContent = msg;
  el.style.display = "block";
}

async function init() {
  const { token } = await sendMsg({ type: "GET_TOKEN" });
  const stored = await chrome.storage.local.get("apiBase");
  const apiBase = stored.apiBase || DEFAULT_API;

  if (!token) {
    document.getElementById("login-view").style.display = "block";
    document.getElementById("api-base-input").value = apiBase;
  } else {
    document.getElementById("main-view").style.display = "block";
    document.getElementById("api-base-display").value = apiBase;
  }
}

// Login
document.getElementById("login-btn")?.addEventListener("click", async () => {
  const pw = document.getElementById("password-input").value.trim();
  const apiBaseRaw = document.getElementById("api-base-input").value.trim();
  document.getElementById("login-error").style.display = "none";

  if (!pw) { showError("Enter a password"); return; }
  if (!apiBaseRaw) { showError("Enter your Railway backend URL"); return; }

  // Ensure URL has https://
  const apiBase = apiBaseRaw.startsWith("http") ? apiBaseRaw : `https://${apiBaseRaw}`;
  await sendMsg({ type: "SET_API_BASE", apiBase });

  document.getElementById("login-btn").textContent = "Signing in...";
  document.getElementById("login-btn").disabled = true;

  const res = await sendMsg({ type: "LOGIN", password: pw });

  document.getElementById("login-btn").textContent = "Sign in";
  document.getElementById("login-btn").disabled = false;

  if (res.success) {
    document.getElementById("login-view").style.display = "none";
    document.getElementById("main-view").style.display = "block";
    document.getElementById("api-base-display").value = apiBase;
  } else {
    const errMsg = res.error || "Login failed";
    if (errMsg.toLowerCase().includes("fetch") || errMsg.toLowerCase().includes("network")) {
      showError(`Cannot reach backend.\nURL tried: ${apiBase}\n\nCheck your Railway URL is correct and backend is running.`);
    } else {
      showError(errMsg);
    }
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
