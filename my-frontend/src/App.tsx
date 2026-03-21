import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './components/auth/protected-route'
import { ToastViewport } from './components/ui/toast-viewport'
import { LoginPage } from './pages/login-page'
import { RegisterPage } from './pages/register-page'
import { WorkspacePage } from './pages/workspace-page'

function App() {
  return (
    <BrowserRouter>
      <ToastViewport />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <WorkspacePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
