import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuth } from '@/features/auth/hooks/useAuth'
import LoginPage from '@/features/auth/components/LoginPage'
import DashboardPage from '@/features/dashboard/components/DashboardPage'
import CustomersPage from '@/features/customers/components/CustomersPage'
import OrdersPage from '@/features/orders/components/OrdersPage'
import FinancePage from '@/features/finance/components/FinancePage'
import ReportsPage from '@/features/reports/components/ReportsPage'
import SettingsPage from '@/features/settings/components/SettingsPage'
import LoadingSpinner from '@/components/common/Loading/LoadingSpinner'
import { ROUTES } from '@/utils/constants'

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  return <>{children}</>
}

// Public Route Component (redirect to dashboard if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return <>{children}</>
}

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path={ROUTES.LOGIN} 
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } 
      />
      
      {/* Protected Routes */}
      <Route 
        path={ROUTES.DASHBOARD} 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path={ROUTES.CUSTOMERS} 
        element={
          <ProtectedRoute>
            <CustomersPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path={ROUTES.ORDERS} 
        element={
          <ProtectedRoute>
            <OrdersPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path={ROUTES.ORDER_INPUT} 
        element={
          <ProtectedRoute>
            <OrdersPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path={ROUTES.FINANCE} 
        element={
          <ProtectedRoute>
            <FinancePage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path={ROUTES.REPORTS} 
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path={ROUTES.SETTINGS} 
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Default redirect */}
      <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  )
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
