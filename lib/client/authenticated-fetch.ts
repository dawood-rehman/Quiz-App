"use client";

let refreshRequest: Promise<boolean> | undefined;

function redirectToLogin() {
  const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
  window.location.assign(`/login?session=expired&next=${next}`);
}

async function refreshSession() {
  if (!refreshRequest) {
    refreshRequest = fetch("/api/auth/refresh", { method: "POST" })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshRequest = undefined;
      });
  }

  return refreshRequest;
}

export async function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  if (response.status !== 401) return response;

  if (!(await refreshSession())) {
    redirectToLogin();
    return response;
  }

  const retryResponse = await fetch(input, init);

  if (retryResponse.status === 401) {
    redirectToLogin();
  }

  return retryResponse;
}
