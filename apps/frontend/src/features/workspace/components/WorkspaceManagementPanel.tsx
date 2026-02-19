"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  getUserWorkspacesClient,
  getWorkspaceContextClient,
  inviteWorkspaceMemberClient,
  removeWorkspaceMemberClient,
  renameWorkspaceClient,
  revokeWorkspaceInvitationClient,
  switchWorkspaceClient,
  updateWorkspaceMemberRoleClient
} from "@/lib/api/workspace.client";
import type { UserWorkspaceItem, WorkspaceDetails, WorkspaceRole } from "@/lib/api/workspace";

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  OWNER: "Owner",
  EDITOR: "Editor",
  VIEWER: "Viewer"
};

function roleTone(role: WorkspaceRole): "accent" | "neutral" | "positive" {
  if (role === "OWNER") {
    return "accent";
  }
  if (role === "EDITOR") {
    return "positive";
  }
  return "neutral";
}

export function WorkspaceManagementPanel({
  initialWorkspace,
  initialWorkspaces
}: {
  initialWorkspace: WorkspaceDetails;
  initialWorkspaces: UserWorkspaceItem[];
}): JSX.Element {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState(initialWorkspace.workspaceName);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>(initialWorkspace.role === "OWNER" ? "EDITOR" : "VIEWER");
  const [memberRoleDraft, setMemberRoleDraft] = useState<Record<string, WorkspaceRole>>({});

  const inviteRoleOptions = useMemo(
    () => (workspace.role === "OWNER" ? (["VIEWER", "EDITOR"] as WorkspaceRole[]) : (["VIEWER"] as WorkspaceRole[])),
    [workspace.role]
  );

  const refreshWorkspaceData = async (targetWorkspaceId?: string): Promise<void> => {
    const [nextContext, nextWorkspaces] = await Promise.all([
      getWorkspaceContextClient(targetWorkspaceId),
      getUserWorkspacesClient()
    ]);
    setWorkspace(nextContext);
    setWorkspaces(nextWorkspaces);
    setWorkspaceName(nextContext.workspaceName);
  };

  const runAction = (action: () => Promise<void>, success: string): void => {
    startTransition(async () => {
      setNotice(null);
      setErrorMessage(null);
      try {
        await action();
        setNotice(success);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Action impossible pour le moment.");
      }
    });
  };

  const updateName = (): void => {
    runAction(async () => {
      await renameWorkspaceClient(workspaceName);
      await refreshWorkspaceData();
    }, "Nom du workspace mis à jour.");
  };

  const inviteMember = (): void => {
    runAction(async () => {
      await inviteWorkspaceMemberClient({
        email: inviteEmail,
        role: inviteRole
      });
      setInviteEmail("");
      await refreshWorkspaceData();
    }, "Invitation envoyée.");
  };

  const revokeInvitation = (invitationId: string): void => {
    runAction(async () => {
      await revokeWorkspaceInvitationClient(invitationId);
      await refreshWorkspaceData();
    }, "Invitation révoquée.");
  };

  const changeMemberRole = (memberId: string, fallbackRole: WorkspaceRole): void => {
    const nextRole = memberRoleDraft[memberId] ?? fallbackRole;
    runAction(async () => {
      await updateWorkspaceMemberRoleClient(memberId, nextRole);
      await refreshWorkspaceData();
    }, "Rôle mis à jour.");
  };

  const removeMember = (memberId: string): void => {
    runAction(async () => {
      await removeWorkspaceMemberClient(memberId);
      await refreshWorkspaceData();
    }, "Membre retiré du workspace.");
  };

  const switchWorkspace = (workspaceId: string): void => {
    runAction(async () => {
      await switchWorkspaceClient(workspaceId);
      await refreshWorkspaceData(workspaceId);
    }, "Workspace actif changé.");
  };

  const canRemoveMember = (member: WorkspaceDetails["members"][number]): boolean => {
    if (!workspace.capabilities.canRemoveMembers) {
      return false;
    }
    if (member.isCurrentUser || member.role === "OWNER") {
      return false;
    }
    if (workspace.role === "EDITOR") {
      return member.role === "VIEWER";
    }
    return true;
  };

  const canEditRole = (member: WorkspaceDetails["members"][number]): boolean => {
    if (!workspace.capabilities.canChangeMemberRole) {
      return false;
    }
    return !member.isCurrentUser && member.role !== "OWNER";
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-3">
        <article className="glass rounded-2xl p-5 lg:col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Workspace actif</p>
          <h2 className="mt-2 text-xl font-semibold text-text">{workspace.workspaceName}</h2>
          <p className="mt-1 text-sm text-text-2">Slug: {workspace.workspaceSlug}</p>
          <p className="mt-1 text-sm text-text-2">Owner: {workspace.ownerEmail}</p>
          <p className="mt-1 text-sm text-text-2">
            Créé le {new Date(workspace.createdAt).toLocaleDateString("fr-FR")} · Ton rôle:{" "}
            <span className="font-semibold text-text">{ROLE_LABEL[workspace.role]}</span>
          </p>
        </article>

        <article className="glass rounded-2xl p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Changer de workspace</p>
          <select
            value={workspace.workspaceId}
            onChange={(event) => switchWorkspace(event.target.value)}
            className="mt-3 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text outline-none transition-all hover:border-border-2 focus:border-accent focus:ring-2 focus:ring-accent/20"
            disabled={isPending}
          >
            {workspaces.map((item) => (
              <option key={item.workspaceId} value={item.workspaceId}>
                {item.workspaceName} ({ROLE_LABEL[item.role]})
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-text-muted">Tu peux basculer ici si tu appartiens à plusieurs workspaces.</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="glass rounded-2xl p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Règles RBAC</p>
          <div className="mt-3 space-y-2 text-sm text-text-2">
            <p><span className="font-semibold text-text">Owner:</span> gère nom, invitations, rôles et suppressions.</p>
            <p><span className="font-semibold text-text">Editor:</span> invite des viewers et peut retirer des viewers.</p>
            <p><span className="font-semibold text-text">Viewer:</span> accès lecture seule au workspace.</p>
          </div>
        </article>

        <article className="glass rounded-2xl p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Capacités de ton rôle</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={workspace.capabilities.canRenameWorkspace ? "positive" : "neutral"}>
              Rename workspace
            </Badge>
            <Badge tone={workspace.capabilities.canInviteMembers ? "positive" : "neutral"}>
              Invite members
            </Badge>
            <Badge tone={workspace.capabilities.canManageInvitations ? "positive" : "neutral"}>
              Manage invitations
            </Badge>
            <Badge tone={workspace.capabilities.canChangeMemberRole ? "positive" : "neutral"}>
              Change member role
            </Badge>
            <Badge tone={workspace.capabilities.canRemoveMembers ? "positive" : "neutral"}>
              Remove members
            </Badge>
          </div>
        </article>
      </section>

      {notice ? (
        <div className="rounded-xl border border-ga/25 bg-ga/10 px-4 py-3 text-sm text-ga">{notice}</div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-xl border border-youtube/25 bg-youtube/10 px-4 py-3 text-sm text-youtube">{errorMessage}</div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="glass rounded-2xl p-5">
          <h3 className="text-base font-semibold text-text">Paramètres workspace</h3>
          {workspace.capabilities.canRenameWorkspace ? (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Input
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="Nom du workspace"
              />
              <Button onClick={updateName} loading={isPending} disabled={workspaceName.trim().length < 3}>
                Enregistrer
              </Button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-text-2">Seul un owner peut renommer le workspace.</p>
          )}
        </article>

        <article className="glass rounded-2xl p-5">
          <h3 className="text-base font-semibold text-text">Inviter un membre</h3>
          {workspace.capabilities.canInviteMembers ? (
            <div className="mt-4 space-y-3">
              <Input
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="email@domaine.com"
                type="email"
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as WorkspaceRole)}
                  className="h-11 min-w-[150px] rounded-xl border border-border bg-surface px-3 text-sm text-text outline-none transition-all hover:border-border-2 focus:border-accent focus:ring-2 focus:ring-accent/20"
                >
                  {inviteRoleOptions.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={inviteMember}
                  loading={isPending}
                  disabled={!inviteEmail.trim()}
                >
                  Envoyer l&apos;invitation
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-text-2">Ton rôle est en lecture seule, invitation désactivée.</p>
          )}
        </article>
      </section>

      <section className="glass overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold text-text">Membres ({workspace.members.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-border/70">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Email</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Rôle</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Depuis</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workspace.members.map((member) => {
                const draft = memberRoleDraft[member.id] ?? member.role;
                return (
                  <tr key={member.id} className="border-b border-border/40 last:border-0">
                    <td className="px-4 py-3 text-sm text-text">
                      {member.email}
                      {member.isCurrentUser ? <span className="ml-2 text-xs text-accent">(toi)</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={roleTone(member.role)}>{ROLE_LABEL[member.role]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-2">
                      {new Date(member.joinedAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {canEditRole(member) ? (
                          <>
                            <select
                              value={draft}
                              onChange={(event) =>
                                setMemberRoleDraft((previous) => ({
                                  ...previous,
                                  [member.id]: event.target.value as WorkspaceRole
                                }))
                              }
                              className="h-8 rounded-lg border border-border bg-surface px-2 text-xs text-text outline-none transition-all hover:border-border-2 focus:border-accent focus:ring-2 focus:ring-accent/20"
                            >
                              <option value="VIEWER">Viewer</option>
                              <option value="EDITOR">Editor</option>
                            </select>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => changeMemberRole(member.id, member.role)}
                              loading={isPending}
                              disabled={draft === member.role}
                            >
                              Mettre à jour
                            </Button>
                          </>
                        ) : null}
                        {canRemoveMember(member) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-youtube/30 text-youtube hover:border-youtube hover:text-youtube"
                            onClick={() => removeMember(member.id)}
                            loading={isPending}
                          >
                            Retirer
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-text">Invitations</h3>
          <p className="text-xs text-text-muted">{workspace.invitations.length} enregistrements</p>
        </div>
        {!workspace.capabilities.canManageInvitations ? (
          <p className="mt-3 text-sm text-text-2">Ton rôle ne permet pas de consulter l&apos;historique des invitations.</p>
        ) : workspace.invitations.length === 0 ? (
          <p className="mt-3 text-sm text-text-2">Aucune invitation pour ce workspace.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {workspace.invitations.map((invitation) => (
              <article key={invitation.id} className="rounded-xl border border-border bg-surface-2 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text">{invitation.email}</p>
                    <p className="text-xs text-text-2">
                      {ROLE_LABEL[invitation.role]} · créé le {new Date(invitation.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={invitation.status === "PENDING" ? "accent" : "neutral"}>
                      {invitation.status}
                    </Badge>
                    {invitation.status === "PENDING" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => revokeInvitation(invitation.id)}
                        loading={isPending}
                      >
                        Révoquer
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
