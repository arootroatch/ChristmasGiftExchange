let sessionUser = null;

export async function loadSession() {
  const response = await fetch("/.netlify/functions/api-user-get", {method: "GET"});
  if (response.status === 401) {
    sessionUser = null;
    return null;
  }
  if (!response.ok) {
    sessionUser = null;
    throw new Error("Session load failed");
  }
  const data = await response.json();
  sessionUser = {name: data.name, email: data.email};
  return data;
}

export function getSessionUser() {
  return sessionUser;
}

export function setSessionUser({name, email}) {
  sessionUser = {name, email};
}

export function clearSession() {
  sessionUser = null;
}
