import type { UserWorkspaceItem, WorkspaceDetails, WorkspaceRole } from "@/lib/api/workspace";

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

async function fetchWithSession<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
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

export async function getUserWorkspacesClient(): Promise<UserWorkspaceItem[]> {
  return fetchWithSession<UserWorkspaceItem[]>("/workspace/list");
}

export async function getWorkspaceContextClient(workspaceId?: string): Promise<WorkspaceDetails> {
  return fetchWithSession<WorkspaceDetails>(`/workspace/context${buildWorkspaceQuery(workspaceId)}`);
}

export async function switchWorkspaceClient(workspaceId: string): Promise<void> {
  await fetchWithSession("/workspace/switch", {
    method: "POST",
    body: JSON.stringify({ workspaceId })
  });
}

export async function renameWorkspaceClient(name: string, workspaceId?: string): Promise<WorkspaceDetails> {
  return fetchWithSession<WorkspaceDetails>(`/workspace/name${buildWorkspaceQuery(workspaceId)}`, {
    method: "PATCH",
    body: JSON.stringify({ name })
  });
}

export async function inviteWorkspaceMemberClient(
  input: { email: string; role: WorkspaceRole },
  workspaceId?: string
): Promise<void> {
  await fetchWithSession(`/workspace/invitations${buildWorkspaceQuery(workspaceId)}`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function revokeWorkspaceInvitationClient(invitationId: string, workspaceId?: string): Promise<void> {
  await fetchWithSession(`/workspace/invitations/${invitationId}${buildWorkspaceQuery(workspaceId)}`, {
    method: "DELETE"
  });
}

export async function updateWorkspaceMemberRoleClient(
  memberId: string,
  role: WorkspaceRole,
  workspaceId?: string
): Promise<void> {
  await fetchWithSession(`/workspace/members/${memberId}/role${buildWorkspaceQuery(workspaceId)}`, {
    method: "PATCH",
    body: JSON.stringify({ role })
  });
}

export async function removeWorkspaceMemberClient(memberId: string, workspaceId?: string): Promise<void> {
  await fetchWithSession(`/workspace/members/${memberId}${buildWorkspaceQuery(workspaceId)}`, {
    method: "DELETE"
  });
}
