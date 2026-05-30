// Jarvis Chrome Extension — Background Service Worker
// Handles API calls to the Jarvis Railway backend

const DEFAULT_API = "https://jarvis-production-42ed.up.railway.app";

// Get stored API base URL and token
async function getConfig() {
  const data = await chrome.storage.local.get(["apiBase", "token"]);
  return {
    apiBase: data.apiBase || DEFAULT_API,
    token: data.token || "",
  };
}

// API call helper with timeout
async function apiCall(path, options = {}, timeoutMs = 30000) {
  const { apiBase, token } = await getConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiBase}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
  } finally {
    clearTimeout(timer);
  }
}

// Message handler from content script / sidebar
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === "ANALYZE_FIELDS") {
        // Send extracted fields to Jarvis AI for value mapping
        const result = await apiCall("/api/applications/map-fields", {
          method: "POST",
          body: JSON.stringify({ fields: msg.fields, pageTitle: msg.pageTitle, pageText: msg.pageText }),
        });
        sendResponse({ success: true, data: result.data });
      } else if (msg.type === "SAVE_APPLICATION") {
        const result = await apiCall("/api/applications", {
          method: "POST",
          body: JSON.stringify(msg.payload),
        });
        sendResponse({ success: true, data: result.data });
      } else if (msg.type === "GET_PROFILE") {
        // Return the Reelin AI profile
        const result = await apiCall("/api/applications/profile");
        sendResponse({ success: true, data: result.data });
      } else if (msg.type === "LOGIN") {
        const result = await apiCall("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ password: msg.password }),
        });
        if (result.success && result.data?.token) {
          await chrome.storage.local.set({ token: result.data.token, role: result.data.role });
        }
        sendResponse({ success: result.success, data: result.data, error: result.error });
      } else if (msg.type === "GET_TOKEN") {
        const { token, role } = await chrome.storage.local.get(["token", "role"]);
        sendResponse({ token: token || "", role: role || "" });
      } else if (msg.type === "SET_API_BASE") {
        await chrome.storage.local.set({ apiBase: msg.apiBase });
        sendResponse({ success: true });
      } else if (msg.type === "OPEN_SIDEBAR") {
        // Sidebar is injected by content script — tell the tab to open it
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: "Unknown message type" });
      }
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  })();
  return true; // async response
});

// When tab updates, check if it's an accelerator page and update badge
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;
  const acceleratorDomains = [
    "ycombinator.com", "techstars.com", "500.co", "antler.co",
    "seedcamp.com", "plugandplaytechcenter.com", "masschallenge.org",
    "fi.co", "pioneer.app", "joinef.com", "hf0.com", "aigrant.com",
    "neo.com", "nvidia.com/startups", "startup.google.com",
    "microsoft.com/startups", "aws.amazon.com/activate",
    "airtable.com", "typeform.com", "jotform.com", // common form builders
  ];
  const isAccelerator = acceleratorDomains.some(d => tab.url.includes(d));
  if (isAccelerator) {
    chrome.action.setBadgeText({ text: "AI", tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#ffffff", tabId });
  } else {
    chrome.action.setBadgeText({ text: "", tabId });
  }
});
