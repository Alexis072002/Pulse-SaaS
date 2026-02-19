import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type WorkspaceRole = "OWNER" | "EDITOR" | "VIEWER";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

export interface WorkspaceCapabilities {
  canRenameWorkspace: boolean;
  canInviteMembers: boolean;
  canManageInvitations: boolean;
  canChangeMemberRole: boolean;
  canRemoveMembers: boolean;
}

export interface WorkspaceMemberItem {
  id: string;
  email: string;
  role: WorkspaceRole;
  isCurrentUser: boolean;
  joinedAt: string;
}

export interface WorkspaceInvitationItem {
  id: string;
  email: string;
  role: WorkspaceRole;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface WorkspaceDetails {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  createdAt: string;
  ownerEmail: string;
  role: WorkspaceRole;
  capabilities: WorkspaceCapabilities;
  members: WorkspaceMemberItem[];
  invitations: WorkspaceInvitationItem[];
}

export interface UserWorkspaceItem {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  role: WorkspaceRole;
  isActive: boolean;
}

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

export async function getUserWorkspacesClient(): Promise<UserWorkspaceItem[]> {
  return fetchWithSession<UserWorkspaceItem[]>("/workspace/list");
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
