import { MainHeader } from '../components/navigation/main-header'
import { SidebarNav } from '../components/navigation/sidebar-nav'
import { AIAssistantContent } from '../features/ai/components/ai-assistant-content'
import { RepositoryContent } from '../features/repositories/components/repository-content'
import { useWorkspacePage } from '../hooks/use-workspace-page'
import { EditorLayout } from '../layouts/editor-layout'
import { Dashboard } from './Dashboard'

export function WorkspacePage() {
  const {
    activeNavItem,
    createWorkspace,
    createWorkspaceMutation,
    editorStore,
    healthLabel,
    navItems,
    openWorkspace,
    selectFile,
    selectRepository,
    setActiveNavItem,
    token,
    workspacesQuery,
  } = useWorkspacePage()

  const {
    workspaceId,
    repoId,
    fileId,
    filePath,
    content,
    socketConnected,
    openTabs,
    setFile,
    closeFileTab,
    setContent,
  } = editorStore

  const renderedContent =
    activeNavItem === 'dashboard' ? (
      <Dashboard
        workspaces={workspacesQuery.data ?? []}
        isLoading={workspacesQuery.isLoading}
        isCreatingWorkspace={createWorkspaceMutation.isPending}
        onCreateWorkspace={createWorkspace}
        onOpenWorkspace={openWorkspace}
      />
    ) : activeNavItem === 'ai-assistant' ? (
      <AIAssistantContent
        repoId={repoId}
        filePath={filePath}
        content={content}
      />
    ) : (
      <RepositoryContent
        workspaceId={workspaceId}
        repoId={repoId}
        fileId={fileId}
        filePath={filePath}
        content={content}
        openTabs={openTabs}
        accessToken={token ?? ''}
        socketConnected={socketConnected}
        onSelectRepo={selectRepository}
        onSelectFile={selectFile}
        onSelectTab={(tab) => setFile(tab.fileId, tab.filePath)}
        onCloseTab={closeFileTab}
        onEditorChange={setContent}
      />
    )

  return (
    <EditorLayout
      sidebar={
        <SidebarNav
          items={navItems}
          activeItem={activeNavItem}
          onSelect={setActiveNavItem}
        />
      }
      header={
        <MainHeader
          title="Engineering workspace"
          description="A reusable application layout with sidebar navigation, profile-aware header controls, and flexible content panels for dashboard, repositories, and AI tooling."
          healthLabel={healthLabel}
          socketConnected={socketConnected}
        />
      }
      content={renderedContent}
    />
  )
}
