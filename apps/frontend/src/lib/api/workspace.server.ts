import { cookies } from "next/headers";
import type { UserWorkspaceItem, WorkspaceDetails } from "@/lib/api/workspace";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ApiSuccess<TData> {
  success: true;
  data: TData;
  meta: {
    timestamp: string;
    version: string;
  };
}

interface ApiErrorResponse {
  success: false;
  error?: {
    message?: string;
    statusCode?: number;
    code?: string;
  };
}

function buildWorkspaceQuery(workspaceId?: string): string {
  if (!workspaceId) {
    return "";
  }
  const params = new URLSearchParams({ workspaceId });
  return `?${params.toString()}`;
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ApiErrorResponse;
    if (payload?.error?.message) {
      return payload.error.message;
    }
  } catch {
    // noop
  }
  return `Erreur ${response.status}`;
}

async function fetchWithJwt<T>(path: string): Promise<T> {
  const jwt = cookies().get("pulse_access_token")?.value;
  if (!jwt) {
    throw new Error("UNAUTHENTICATED");
  }

  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${jwt}`
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("UNAUTHENTICATED");
    }
    const message = await parseErrorMessage(response);
    throw new Error(message);
  }

  const payload = (await response.json()) as ApiSuccess<T>;
  if (!payload.success) {
    throw new Error("Réponse API invalide.");
  }

  return payload.data;
}

export async function getWorkspaceContext(workspaceId?: string): Promise<WorkspaceDetails> {
  return fetchWithJwt<WorkspaceDetails>(`/workspace/context${buildWorkspaceQuery(workspaceId)}`);
}

export async function getUserWorkspaces(): Promise<UserWorkspaceItem[]> {
  return fetchWithJwt<UserWorkspaceItem[]>("/workspace/list");
}
