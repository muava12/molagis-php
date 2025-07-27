import React, { createContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@/types/common.types'
import { authService } from '@/features/auth/services/authService'
import { supabase } from '@/services/supabase'
import type { Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string, remember?: boolean) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  isAuthenticated: boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            created_at: session.user.created_at || '',
            updated_at: session.user.updated_at || ''
          })
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session)
        
        setSession(session)
        
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            created_at: session.user.created_at || '',
            updated_at: session.user.updated_at || ''
          })
        } else {
          setUser(null)
        }
        
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (
    email: string, 
    password: string, 
    remember: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true)
      
      const response = await authService.signIn({ email, password, remember })
      
      if (response.success && response.data) {
        // Session will be updated via onAuthStateChange
        return { success: true }
      } else {
        return { 
          success: false, 
          error: response.error || 'Login gagal' 
        }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login gagal' 
      }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async (): Promise<void> => {
    try {
      setLoading(true)
      await authService.signOut()
      // Session will be cleared via onAuthStateChange
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshSession = async (): Promise<void> => {
    try {
      await authService.refreshSession()
      // Session will be updated via onAuthStateChange
    } catch (error) {
      console.error('Error refreshing session:', error)
    }
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signOut,
    refreshSession,
    isAuthenticated: !!session && !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}