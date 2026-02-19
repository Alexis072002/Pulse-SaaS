import { redirect } from "next/navigation";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { WorkspaceManagementPanel } from "@/features/workspace";
import { getUserWorkspaces, getWorkspaceContext } from "@/lib/api/workspace.server";

export default async function WorkspacePage(): Promise<JSX.Element> {
  try {
    const [workspace, workspaces] = await Promise.all([
      getWorkspaceContext(),
      getUserWorkspaces()
    ]);

    return (
      <PageWrapper title="Workspace">
        <WorkspaceManagementPanel
          initialWorkspace={workspace}
          initialWorkspaces={workspaces}
        />
      </PageWrapper>
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      redirect("/login");
    }
    throw error;
  }
}
