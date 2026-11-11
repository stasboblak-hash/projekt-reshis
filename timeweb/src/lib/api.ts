export type User = { id: number; name: string; email: string };
export type SessionResponse = { user: User | null; csrfToken: string };

let csrfToken = "";

export function setCsrfToken(token: string) {
  csrfToken = token;
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  if (body !== undefined && !csrfToken) await getSession();
  const headers: Record<string, string> = { "X-Requested-With": "XMLHttpRequest" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    headers["X-CSRF-Token"] = csrfToken;
  }
  const response = await fetch(`/api${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({ error: "Сервер вернул некорректный ответ" }));
  if (!response.ok) throw new Error(data.error || `Ошибка запроса (${response.status})`);
  return data as T;
}

export async function getSession(): Promise<SessionResponse> {
  const session = await api<SessionResponse>("/me");
  setCsrfToken(session.csrfToken);
  return session;
}
