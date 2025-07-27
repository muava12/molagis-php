import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types (will be generated from Supabase later)
export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: number
          nama: string
          alamat: string
          no_hp: string
          created_at: string
          updated_at: string
        }
        Insert: {
          nama: string
          alamat: string
          no_hp: string
        }
        Update: {
          nama?: string
          alamat?: string
          no_hp?: string
        }
      }
      orders: {
        Row: {
          id: number
          customer_id: number
          total_harga: number
          created_at: string
          updated_at: string
        }
        Insert: {
          customer_id: number
          total_harga: number
        }
        Update: {
          customer_id?: number
          total_harga?: number
        }
      }
      couriers: {
        Row: {
          id: number
          nama: string
          color: string
          aktif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          nama: string
          color: string
          aktif?: boolean
        }
        Update: {
          nama?: string
          color?: string
          aktif?: boolean
        }
      }
      settings: {
        Row: {
          id: number
          key: string
          value: string
          created_at: string
          updated_at: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
      }
      labels: {
        Row: {
          id: number
          name: string
          category: string
          description: string | null
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          category: string
          description?: string | null
          color?: string | null
        }
        Update: {
          name?: string
          category?: string
          description?: string | null
          color?: string | null
        }
      }
      expense_categories: {
        Row: {
          id: number
          name: string
          display_name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          display_name: string
          description?: string | null
        }
        Update: {
          name?: string
          display_name?: string
          description?: string | null
        }
      }
      financial_records: {
        Row: {
          id: number
          transaction_date: string
          amount: number
          type: 'income' | 'expense'
          description: string
          category_id: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          transaction_date: string
          amount: number
          type: 'income' | 'expense'
          description: string
          category_id?: number | null
        }
        Update: {
          transaction_date?: string
          amount?: number
          type?: 'income' | 'expense'
          description?: string
          category_id?: number | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}