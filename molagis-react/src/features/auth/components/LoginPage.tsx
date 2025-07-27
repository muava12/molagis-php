import React, { useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { APP_NAME } from '@/utils/constants'
import LoadingSpinner from '@/components/common/Loading/LoadingSpinner'

const LoginPage: React.FC = () => {
  const { signIn, loading } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false
  })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    // Clear error when user starts typing
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await signIn(formData.email, formData.password, formData.remember)
      
      if (!result.success) {
        setError(result.error || 'Login gagal')
      }
    } catch (err) {
      setError('Terjadi kesalahan yang tidak terduga')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingSpinner text="Memuat..." />
  }

  return (
    <div className="page page-center">
      <div className="container container-tight py-4">
        <div className="text-center mb-4">
          <a href="." className="navbar-brand navbar-brand-autodark">
            <img src="/images/fruit.png" width="110" height="32" alt={APP_NAME} className="navbar-brand-image" />
          </a>
        </div>
        
        <div className="card card-md">
          <div className="card-body">
            <h2 className="h2 text-center mb-4">Login ke akun Anda</h2>
            
            {error && (
              <div className="alert alert-danger" role="alert">
                <div className="d-flex">
                  <div className="alert-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon alert-icon">
                      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"></path>
                      <path d="M12 8v4"></path>
                      <path d="M12 16h.01"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 className="alert-heading">Login Gagal</h4>
                    <div className="text-muted">{error}</div>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} autoComplete="off" noValidate>
              <div className="mb-3">
                <label className="form-label">Email address</label>
                <input 
                  type="email" 
                  name="email"
                  className="form-control" 
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  autoComplete="username"
                  required
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="mb-2">
                <label className="form-label">
                  Password
                  <span className="form-label-description">
                    <a href="#" onClick={(e) => e.preventDefault()}>Lupa password?</a>
                  </span>
                </label>
                <div className="input-group input-group-flat">
                  <input 
                    type="password" 
                    name="password"
                    className="form-control" 
                    placeholder="Your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    autoComplete="current-password"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              
              <div className="mb-2">
                <label className="form-check">
                  <input 
                    type="checkbox" 
                    name="remember"
                    className="form-check-input"
                    checked={formData.remember}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                  <span className="form-check-label">Ingat saya di perangkat ini</span>
                </label>
              </div>
              
              <div className="form-footer">
                <button 
                  type="submit" 
                  className="btn btn-primary w-100"
                  disabled={isSubmitting || !formData.email || !formData.password}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Masuk...
                    </>
                  ) : (
                    'Masuk'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
        
        <div className="text-center text-muted mt-3">
          Belum punya akun? <a href="#" onClick={(e) => e.preventDefault()}>Daftar</a>
        </div>
      </div>
    </div>
  )
}

export default LoginPage