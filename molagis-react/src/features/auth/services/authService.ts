import { supabase } from '@/services/supabase'
import { ApiResponse, User } from '@/types/common.types'
import { getErrorMessage } from '@/utils/helpers'

export interface LoginCredentials {
  email: string
  password: string
  remember?: boolean
}

export interface AuthResponse {
  user: User | null
  access_token: string | null
  refresh_token: string | null
}

class AuthService {
  async signIn(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    try {
      // Mock authentication for development
      if (credentials.email === 'test@example.com' && credentials.password === 'password123') {
        const mockAuthResponse: AuthResponse = {
          user: {
            id: 'mock-user-id',
            email: 'test@example.com',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token'
        }

        // Store mock session in localStorage
        localStorage.setItem('mock_session', JSON.stringify({
          user: mockAuthResponse.user,
          access_token: mockAuthResponse.access_token,
          refresh_token: mockAuthResponse.refresh_token,
          expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        }))

        return {
          data: mockAuthResponse,
          error: null,
          success: true
        }
      }

      // For real Supabase authentication (commented out for now)
      /*
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) {
        let errorMessage = 'Login gagal'
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Email atau kata sandi salah'
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Email belum dikonfirmasi'
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Terlalu banyak percobaan login, coba lagi nanti'
        }
        
        return {
          data: null,
          error: errorMessage,
          success: false
        }
      }

      if (!data.user || !data.session) {
        return {
          data: null,
          error: 'Login gagal: Data pengguna tidak ditemukan',
          success: false
        }
      }

      const authResponse: AuthResponse = {
        user: {
          id: data.user.id,
          email: data.user.email || '',
          created_at: data.user.created_at || '',
          updated_at: data.user.updated_at || ''
        },
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      }

      return {
        data: authResponse,
        error: null,
        success: true
      }
      */

      return {
        data: null,
        error: 'Email atau kata sandi salah',
        success: false
      }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error),
        success: false
      }
    }
  }

  async signOut(): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        return {
          data: null,
          error: 'Logout gagal: ' + error.message,
          success: false
        }
      }

      return {
        data: null,
        error: null,
        success: true
      }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error),
        success: false
      }
    }
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      // Check for mock session first
      const mockSession = localStorage.getItem('mock_session')
      if (mockSession) {
        const session = JSON.parse(mockSession)
        if (session.expires_at > Date.now()) {
          return {
            data: session.user,
            error: null,
            success: true
          }
        } else {
          localStorage.removeItem('mock_session')
        }
      }

      // For real Supabase authentication (commented out for now)
      /*
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        return {
          data: null,
          error: error.message,
          success: false
        }
      }

      if (!user) {
        return {
          data: null,
          error: 'User tidak ditemukan',
          success: false
        }
      }

      const userData: User = {
        id: user.id,
        email: user.email || '',
        created_at: user.created_at || '',
        updated_at: user.updated_at || ''
      }

      return {
        data: userData,
        error: null,
        success: true
      }
      */

      return {
        data: null,
        error: 'User tidak ditemukan',
        success: false
      }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error),
        success: false
      }
    }
  }

  async refreshSession(): Promise<ApiResponse<AuthResponse>> {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        return {
          data: null,
          error: 'Gagal memperbarui sesi: ' + error.message,
          success: false
        }
      }

      if (!data.user || !data.session) {
        return {
          data: null,
          error: 'Gagal memperbarui sesi: Data tidak lengkap',
          success: false
        }
      }

      const authResponse: AuthResponse = {
        user: {
          id: data.user.id,
          email: data.user.email || '',
          created_at: data.user.created_at || '',
          updated_at: data.user.updated_at || ''
        },
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      }

      return {
        data: authResponse,
        error: null,
        success: true
      }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error),
        success: false
      }
    }
  }

  async resetPassword(email: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      
      if (error) {
        return {
          data: null,
          error: 'Gagal mengirim email reset password: ' + error.message,
          success: false
        }
      }

      return {
        data: null,
        error: null,
        success: true
      }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error),
        success: false
      }
    }
  }

  async updatePassword(newPassword: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) {
        return {
          data: null,
          error: 'Gagal mengubah password: ' + error.message,
          success: false
        }
      }

      return {
        data: null,
        error: null,
        success: true
      }
    } catch (error) {
      return {
        data: null,
        error: getErrorMessage(error),
        success: false
      }
    }
  }

  // Get current session
  getCurrentSession() {
    return supabase.auth.getSession()
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      // Check for mock session first
      const mockSession = localStorage.getItem('mock_session')
      if (mockSession) {
        const session = JSON.parse(mockSession)
        if (session.expires_at > Date.now()) {
          return true
        } else {
          localStorage.removeItem('mock_session')
        }
      }

      // For real Supabase authentication (commented out for now)
      /*
      const { data: { session } } = await supabase.auth.getSession()
      return !!session
      */
      
      return false
    } catch {
      return false
    }
  }

  // Get access token
  async getAccessToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token || null
    } catch {
      return null
    }
  }
}

export const authService = new AuthService()