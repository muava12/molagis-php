// Common types used across the application

export interface ApiResponse<T = any> {
  data: T | null
  error: string | null
  success?: boolean
}

export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export interface PaginationInfo {
  current_page: number
  per_page: number
  total_records: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export interface Customer {
  id: number
  nama: string
  alamat: string
  no_hp: string
  created_at: string
  updated_at: string
  labels?: Label[]
}

export interface Order {
  id: number
  customer_id: number
  customer_name?: string
  total_harga: number
  created_at: string
  updated_at: string
}

export interface Courier {
  id: number
  nama: string
  color: string
  aktif: boolean
  created_at: string
  updated_at: string
}

export interface Label {
  id: number
  name: string
  category: string
  description: string | null
  color: string | null
  created_at: string
  updated_at: string
}

export interface Setting {
  id: number
  key: string
  value: string
  created_at: string
  updated_at: string
}

export interface ExpenseCategory {
  id: number
  name: string
  display_name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface FinancialRecord {
  id: number
  transaction_date: string
  amount: number
  type: 'income' | 'expense'
  description: string
  category_id: number | null
  category?: ExpenseCategory
  created_at: string
  updated_at: string
}

export interface DeliveryItem {
  kurir_id: number | null
  courier_name: string
  jumlah_pengantaran: number
  jumlah_selesai: number
}

export interface DashboardStatistics {
  total_orders_today: number
  total_revenue_today: number
  pending_deliveries_today: number
}

export interface OverviewCardData {
  label: string
  value: number
  error?: string | null
  dummy_percentage_change?: string
  dummy_trend?: 'up' | 'down' | 'stable'
  values?: number[]
  latest_value?: number
}

export interface ChartData {
  labels: string[]
  values: number[]
}

// Form types
export interface CustomerFormData {
  nama: string
  alamat: string
  no_hp: string
}

export interface OrderFormData {
  customer_id: number
  total_harga: number
  package_items: Array<{
    paket_id: number
    quantity: number
    harga: number
  }>
  tanggal: string
  kurir_id?: number | null
  ongkir?: number
}

export interface FinancialRecordFormData {
  transaction_date: string
  amount: number
  type: 'income' | 'expense'
  description: string
  category_id?: number | null
}

// Filter types
export interface CustomerFilters {
  search?: string
  label_id?: number
}

export interface OrderFilters {
  customer_id?: number
  date_from?: string
  date_to?: string
  status?: string
}

export interface FinanceFilters {
  start_date?: string
  end_date?: string
  category_id?: number
  type?: 'income' | 'expense'
}

// Modal types
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

// Toast types
export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

// Theme types
export type Theme = 'light' | 'dark'

// Loading states
export interface LoadingState {
  isLoading: boolean
  error: string | null
}

// Table types
export interface TableColumn<T = any> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
  width?: string
}

export interface TableProps<T = any> {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  pagination?: PaginationInfo
  onPageChange?: (page: number) => void
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  selectedRows?: T[]
  onRowSelect?: (rows: T[]) => void
  actions?: Array<{
    label: string
    onClick: (row: T) => void
    icon?: React.ReactNode
    variant?: 'primary' | 'secondary' | 'danger'
  }>
}