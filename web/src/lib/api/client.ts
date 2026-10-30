export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ApiClientOptions {
  baseUrl: string;
  getToken: () => Promise<string | null>;
  onUnauthorized?: () => void;
  fetchImpl?: typeof fetch;
}

function parseJson(text: string): Record<string, unknown> | null {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export function createApiClient({
  baseUrl,
  getToken,
  onUnauthorized,
  fetchImpl = (...args) => fetch(...args)
}: ApiClientOptions) {
  async function request<T>(
    path: string,
    method: string,
    body?: unknown
  ): Promise<T> {
    const token = await getToken();
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    const headers: Record<string, string> = {};
    // fetch sets the multipart boundary itself, so FormData gets no content type.
    if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : isForm
            ? (body as FormData)
            : JSON.stringify(body)
    });

    const data = parseJson(await res.text());

    if (!res.ok) {
      if (res.status === 401) onUnauthorized?.();

      const message =
        (data?.error as string | undefined) ??
        (data?.message as string | undefined) ??
        (res.statusText || "Request failed");
      throw new ApiError(res.status, message);
    }

    return data as T;
  }

  return {
    get: <T>(path: string) => request<T>(path, "GET"),
    post: <T>(path: string, body?: unknown) => request<T>(path, "POST", body ?? {}),
    put: <T>(path: string, body?: unknown) => request<T>(path, "PUT", body ?? {}),
    patch: <T>(path: string, body?: unknown) => request<T>(path, "PATCH", body ?? {}),
    delete: <T>(path: string) => request<T>(path, "DELETE")
  };
}
