import { format, parseISO, isValid } from 'date-fns'
import { id } from 'date-fns/locale'
import { DATE_FORMATS, DEFAULTS } from './constants'

// Date utilities
export const formatDate = (date: string | Date, formatStr: string = DATE_FORMATS.DISPLAY): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return ''
    return format(dateObj, formatStr, { locale: id })
  } catch {
    return ''
  }
}

export const formatCurrency = (amount: number, currency: string = DEFAULTS.CURRENCY): string => {
  try {
    if (currency === 'IDR') {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount)
    }
    return new Intl.NumberFormat('id-ID').format(amount)
  } catch {
    return amount.toString()
  }
}

export const formatNumber = (num: number): string => {
  try {
    return new Intl.NumberFormat('id-ID').format(num)
  } catch {
    return num.toString()
  }
}

// String utilities
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const isValidPhone = (phone: string): boolean => {
  // Indonesian phone number validation
  const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/
  return phoneRegex.test(phone.replace(/\s|-/g, ''))
}

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Array utilities
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key])
    groups[group] = groups[group] || []
    groups[group].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

export const sortBy = <T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}

export const uniqueBy = <T>(array: T[], key: keyof T): T[] => {
  const seen = new Set()
  return array.filter(item => {
    const value = item[key]
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

// Object utilities
export const omit = <T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj }
  keys.forEach(key => delete result[key])
  return result
}

export const pick = <T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key]
    }
  })
  return result
}

export const isEmpty = (value: unknown): boolean => {
  if (value == null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

// Local storage utilities
export const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

export const setToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
  }
}

export const removeFromStorage = (key: string): void => {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Failed to remove from localStorage:', error)
  }
}

// URL utilities
export const buildQueryString = (params: Record<string, unknown>): string => {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  
  return searchParams.toString()
}

export const parseQueryString = (queryString: string): Record<string, string> => {
  const params = new URLSearchParams(queryString)
  const result: Record<string, string> = {}
  
  params.forEach((value, key) => {
    result[key] = value
  })
  
  return result
}

// Error handling utilities
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return 'An unknown error occurred'
}

export const isNetworkError = (error: unknown): boolean => {
  const message = getErrorMessage(error).toLowerCase()
  return message.includes('network') || 
         message.includes('fetch') || 
         message.includes('connection') ||
         message.includes('timeout')
}

// Debounce utility
export const debounce = <T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle utility
export const throttle = <T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Random utilities
export const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export const generateColor = (): string => {
  const colors = [
    '#206bc4', '#2fb344', '#fd7e14', '#d63384', 
    '#17a2b8', '#6c757d', '#e74c3c', '#9b59b6',
    '#f39c12', '#1abc9c', '#34495e', '#95a5a6'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

// File utilities
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}

// Avatar utilities
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

export const getAvatarUrl = (seed: string): string => {
  return `https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=${encodeURIComponent(seed)}`
}

// Business logic utilities
export const calculateTotal = (items: Array<{ quantity: number; price: number }>): number => {
  return items.reduce((total, item) => total + (item.quantity * item.price), 0)
}

export const calculateTax = (amount: number, taxRate: number = 0.1): number => {
  return amount * taxRate
}

export const isWeekend = (date: Date): boolean => {
  const day = date.getDay()
  return day === 0 || day === 6 // Sunday = 0, Saturday = 6
}

export const isSunday = (date: Date): boolean => {
  return date.getDay() === 0
}

// Performance utilities
export const memoize = <T extends (...args: unknown[]) => unknown>(fn: T): T => {
  const cache = new Map()
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args)
    if (cache.has(key)) {
      return cache.get(key)
    }
    
    const result = fn(...args)
    cache.set(key, result)
    return result
  }) as T
}
export const formatTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return ''
    return format(dateObj, 'HH:mm', { locale: id })
  } catch {
    return ''
  }
}