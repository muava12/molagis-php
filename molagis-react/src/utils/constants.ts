// Application constants

export const APP_NAME = 'Molagis Admin Dashboard'
export const APP_VERSION = '1.0.0'

// API endpoints (for reference, we'll use Supabase directly)
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/v1/token',
    LOGOUT: '/auth/v1/logout',
    USER: '/auth/v1/user',
  },
  CUSTOMERS: '/rest/v1/customers',
  ORDERS: '/rest/v1/orders',
  COURIERS: '/rest/v1/couriers',
  SETTINGS: '/rest/v1/settings',
  LABELS: '/rest/v1/labels',
  FINANCE: '/rest/v1/financial_records',
  EXPENSE_CATEGORIES: '/rest/v1/expense_categories',
} as const

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'molagis_theme',
  NUMBERS_BLURRED: 'numbersBlurred',
  USER_PREFERENCES: 'molagis_user_preferences',
} as const

// Theme options
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
} as const

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  ALLOWED_LIMITS: [10, 50, 100, 500],
  MAX_LIMIT: 1000,
} as const

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'dd MMMM yyyy',
  INPUT: 'yyyy-MM-dd',
  DATETIME: 'dd/MM/yyyy HH:mm',
  API: 'yyyy-MM-dd',
} as const

// Toast durations (in milliseconds)
export const TOAST_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  WARNING: 4000,
  INFO: 3000,
} as const

// Modal sizes
export const MODAL_SIZES = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
  XL: 'xl',
} as const

// Form validation messages
export const VALIDATION_MESSAGES = {
  REQUIRED: 'Field ini wajib diisi',
  EMAIL: 'Format email tidak valid',
  MIN_LENGTH: (min: number) => `Minimal ${min} karakter`,
  MAX_LENGTH: (max: number) => `Maksimal ${max} karakter`,
  PHONE: 'Format nomor telepon tidak valid',
  NUMBER: 'Harus berupa angka',
  POSITIVE_NUMBER: 'Harus berupa angka positif',
} as const

// Business settings keys
export const SETTINGS_KEYS = {
  BUSINESS_NAME: 'business_name',
  DEFAULT_COURIER: 'default_courier',
  DEFAULT_SHIPPING_COST: 'default_shipping_cost',
} as const

// Financial record types
export const FINANCIAL_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
} as const

// Order statuses
export const ORDER_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const

// Delivery statuses
export const DELIVERY_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  DELIVERED: 'delivered',
} as const

// Label categories
export const LABEL_CATEGORIES = {
  CUSTOMER_STATUS: 'Status Pelanggan',
  HOLIDAY_INFO: 'Info Hari Besar',
} as const

// Default values
export const DEFAULTS = {
  BUSINESS_NAME: 'Molagis',
  SHIPPING_COST: 5000,
  TIMEZONE: 'Asia/Makassar',
  CURRENCY: 'IDR',
  LOCALE: 'id-ID',
} as const

// Chart colors (matching Tabler theme)
export const CHART_COLORS = {
  PRIMARY: '#206bc4',
  SUCCESS: '#2fb344',
  WARNING: '#fd7e14',
  DANGER: '#d63384',
  INFO: '#17a2b8',
  SECONDARY: '#6c757d',
} as const

// Responsive breakpoints (matching Tabler)
export const BREAKPOINTS = {
  SM: 576,
  MD: 768,
  LG: 992,
  XL: 1200,
  XXL: 1400,
} as const

// File upload limits
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'text/csv', 'application/json'],
} as const

// Debounce delays (in milliseconds)
export const DEBOUNCE_DELAY = {
  SEARCH: 300,
  RESIZE: 100,
  SCROLL: 50,
} as const

// Error messages
export const ERROR_MESSAGES = {
  NETWORK: 'Koneksi internet bermasalah, silakan cek koneksi Anda',
  UNAUTHORIZED: 'Sesi Anda telah berakhir, silakan login kembali',
  FORBIDDEN: 'Anda tidak memiliki akses untuk melakukan aksi ini',
  NOT_FOUND: 'Data tidak ditemukan',
  SERVER_ERROR: 'Terjadi kesalahan pada server, silakan coba lagi',
  VALIDATION: 'Data yang dimasukkan tidak valid',
  UNKNOWN: 'Terjadi kesalahan yang tidak diketahui',
} as const

// Success messages
export const SUCCESS_MESSAGES = {
  CREATED: 'Data berhasil ditambahkan',
  UPDATED: 'Data berhasil diperbarui',
  DELETED: 'Data berhasil dihapus',
  SAVED: 'Data berhasil disimpan',
  LOGIN: 'Login berhasil',
  LOGOUT: 'Logout berhasil',
} as const

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  CUSTOMERS: '/customers',
  ORDERS: '/orders',
  ORDER_INPUT: '/input-order',
  FINANCE: '/finance',
  REPORTS: '/reports',
  SETTINGS: '/settings',
} as const