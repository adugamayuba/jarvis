const TOKEN_KEY = "jarvis_token";
const ROLE_KEY = "jarvis_role";

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
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function getRole(): "admin" | "cofounder" | null {
  if (typeof window === "undefined") return null;
  return (localStorage.getItem(ROLE_KEY) as "admin" | "cofounder") || null;
}

export function setRole(role: "admin" | "cofounder") {
  localStorage.setItem(ROLE_KEY, role);
}

export function isAdmin(): boolean {
  return getRole() === "admin";
}

export function isCofounder(): boolean {
  return getRole() === "cofounder";
}
