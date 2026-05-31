"use client";

let refreshRequest: Promise<boolean> | undefined;

function redirectToLogin() {
  const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
  window.location.assign(`/login?session=expired&next=${next}`);
}

async function safeFetch(input: RequestInfo | URL, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch {
    return undefined;
  }
}

async function refreshSession() {
  if (!refreshRequest) {
    refreshRequest = safeFetch("/api/auth/refresh", { method: "POST", credentials: "same-origin" })
      .then((response) => Boolean(response?.ok))
      .finally(() => {
        refreshRequest = undefined;
      });
  }

  return refreshRequest;
}

export async function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const requestInit: RequestInit = { credentials: "same-origin", ...init };
  const response = await safeFetch(input, requestInit);
  if (!response) return new Response(null, { status: 503, statusText: "Network unavailable" });
  if (response.status !== 401) return response;

  if (!(await refreshSession())) {
    redirectToLogin();
    return response;
  }

  const retryResponse = await safeFetch(input, requestInit);
  if (!retryResponse) return new Response(null, { status: 503, statusText: "Network unavailable" });

  if (retryResponse.status === 401) {
    redirectToLogin();
  }

  return retryResponse;
}
