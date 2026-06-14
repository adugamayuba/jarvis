const TOKEN_KEY = "jarvis_token";
const ROLE_KEY = "jarvis_role";
const PORTAL_USER_ID_KEY = "jarvis_portal_user_id";
const PORTAL_NAME_KEY = "jarvis_portal_name";
const PORTAL_EMAIL_KEY = "jarvis_portal_email";

export type UserRole = "admin" | "cofounder" | "investor";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(PORTAL_USER_ID_KEY);
  localStorage.removeItem(PORTAL_NAME_KEY);
  localStorage.removeItem(PORTAL_EMAIL_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function getRole(): UserRole | null {
  if (typeof window === "undefined") return null;
  return (localStorage.getItem(ROLE_KEY) as UserRole) || null;
}

export function setRole(role: UserRole) {
  localStorage.setItem(ROLE_KEY, role);
}

export function setPortalSession(data: { portalUserId: string; name: string; email: string }) {
  localStorage.setItem(PORTAL_USER_ID_KEY, data.portalUserId);
  localStorage.setItem(PORTAL_NAME_KEY, data.name);
  localStorage.setItem(PORTAL_EMAIL_KEY, data.email);
}

export function getPortalName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(PORTAL_NAME_KEY) || "";
}

export function getPortalEmail(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(PORTAL_EMAIL_KEY) || "";
}

export function isAdmin(): boolean {
  return getRole() === "admin";
}

export function isCofounder(): boolean {
  return getRole() === "cofounder";
}

export function isInvestor(): boolean {
  return getRole() === "investor";
}
