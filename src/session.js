let sessionUser = null;
let viewingAs = null;

export async function loadSession() {
  const response = await fetch("/.netlify/functions/api-user-get", {method: "GET"});
  if (!response.ok) {
    sessionUser = null;
    viewingAs = null;
    throw new Error("Session load failed");
  }
  const data = await response.json();
  if (!data) {
    sessionUser = null;
    viewingAs = null;
    return null;
  }
  sessionUser = {name: data.name, email: data.email};
  viewingAs = data.viewingAs ?? null;
  return data;
}

export function getSessionUser() {
  return sessionUser;
}

export function getViewingAs() {
  return viewingAs;
}

export function setSessionUser({name, email}) {
  sessionUser = {name, email};
}

export function clearSession() {
  sessionUser = null;
  viewingAs = null;
}
