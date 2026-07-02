import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from '../auth/protected-route'
import { LoginRoute } from '../routes/login/login-route'
import { RegisterRoute } from '../routes/register/register-route'
import { RepoIdeRoute } from '../routes/repo-ide/repo-ide-route'
import { WorkspaceReposRoute } from '../routes/workspace-repos/workspace-repos-route'
import { WorkspacesRoute } from '../routes/workspaces/workspaces-route'
import { RootLayout } from './root-layout'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/register" element={<RegisterRoute />} />
        <Route
          element={
            <ProtectedRoute>
              <RootLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/w" element={<WorkspacesRoute />} />
          <Route path="/w/:workspaceId" element={<WorkspaceReposRoute />} />
          <Route path="/w/:workspaceId/r/:repoId" element={<RepoIdeRoute />} />
          <Route path="/w/:workspaceId/r/:repoId/f/*" element={<RepoIdeRoute />} />
        </Route>
        <Route path="/" element={<Navigate to="/w" replace />} />
        <Route path="*" element={<Navigate to="/w" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
