import type { AlertaEstoque, AlertaFormValues, AlertasFilters, AuthUser } from "./types";

const AUTH_API = import.meta.env.VITE_MS_AUTH_URL || "http://localhost:3001";
const ALERTS_API = import.meta.env.VITE_MS_ALERTS_URL || (
  typeof window !== "undefined" ? window.location.origin : "http://localhost:3002"
);

function getToken() {
  return localStorage.getItem("token");
}

function authHeaders() {
  const token = getToken();

  return {
    Authorization: `Bearer ${token}`,
  };
}

function buildQuery(filters: Partial<AlertasFilters>) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    window.location.href = "/login";
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message || body.detail || "Erro ao processar requisição");
  }

  return body as T;
}

export async function getCurrentUser() {
  const response = await fetch(`${AUTH_API}/auth/me`, {
    headers: authHeaders(),
  });

  return parseResponse<AuthUser>(response);
}

export async function listActiveAlerts(filters: Partial<AlertasFilters>) {
  const response = await fetch(`${ALERTS_API}/alerta/ativos${buildQuery(filters)}`, {
    headers: authHeaders(),
  });

  return parseResponse<AlertaEstoque[]>(response);
}

export async function listAlertConfigs(filters: Partial<AlertasFilters>) {
  const response = await fetch(`${ALERTS_API}/alerta${buildQuery(filters)}`, {
    headers: authHeaders(),
  });

  return parseResponse<AlertaEstoque[]>(response);
}

export async function createAlertConfig(values: AlertaFormValues) {
  const response = await fetch(`${ALERTS_API}/alerta`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toPayload(values)),
  });

  return parseResponse<AlertaEstoque>(response);
}

export async function updateAlertConfig(id: string, values: AlertaFormValues) {
  const response = await fetch(`${ALERTS_API}/alerta/${id}`, {
    method: "PATCH",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toPayload(values)),
  });

  return parseResponse<AlertaEstoque>(response);
}

export async function deleteAlertConfig(id: string) {
  const response = await fetch(`${ALERTS_API}/alerta/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!response.ok && response.status !== 204) {
    await parseResponse(response);
  }
}

function toPayload(values: AlertaFormValues) {
  return {
    produtoId: values.produtoId,
    roupaId: values.roupaId || undefined,
    produtoNome: values.produtoNome || undefined,
    categoria: values.categoria || undefined,
    tamanho: values.tamanho || undefined,
    cor: values.cor || undefined,
    quantidadeMinima: Number(values.quantidadeMinima),
    ativo: values.ativo,
  };
}
