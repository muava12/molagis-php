import { supabase } from '@/services/supabase'
import { ApiResponse } from '@/types/common.types'
import { getErrorMessage } from '@/utils/helpers'

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

export interface RecentOrder {
  order_id: number
  customer_name: string
  total_harga: number
  created_at: string
}

class DashboardService {
  async getDeliveries(date: string): Promise<ApiResponse<DeliveryItem[]>> {
    try {
      // This would be replaced with actual Supabase query
      // For now, return mock data
      const mockDeliveries: DeliveryItem[] = [
        {
          kurir_id: 1,
          courier_name: 'Ahmad Kurir',
          jumlah_pengantaran: 15,
          jumlah_selesai: 12
        },
        {
          kurir_id: 2,
          courier_name: 'Budi Express',
          jumlah_pengantaran: 8,
          jumlah_selesai: 8
        },
        {
          kurir_id: null,
          courier_name: 'Belum Dipilih',
          jumlah_pengantaran: 3,
          jumlah_selesai: 0
        }
      ]

      return {
        data: mockDeliveries,
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

  async getDashboardStatistics(): Promise<ApiResponse<DashboardStatistics>> {
    try {
      // Mock data for now
      const mockStats: DashboardStatistics = {
        total_orders_today: 25,
        total_revenue_today: 2500000,
        pending_deliveries_today: 3
      }

      return {
        data: mockStats,
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

  async getRecentOrders(limit: number = 5): Promise<ApiResponse<RecentOrder[]>> {
    try {
      // Mock data for now
      const mockOrders: RecentOrder[] = [
        {
          order_id: 1001,
          customer_name: 'PT. Maju Jaya',
          total_harga: 150000,
          created_at: new Date().toISOString()
        },
        {
          order_id: 1002,
          customer_name: 'CV. Berkah Selalu',
          total_harga: 200000,
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          order_id: 1003,
          customer_name: 'Toko Sumber Rejeki',
          total_harga: 175000,
          created_at: new Date(Date.now() - 7200000).toISOString()
        },
        {
          order_id: 1004,
          customer_name: 'Warung Bu Siti',
          total_harga: 85000,
          created_at: new Date(Date.now() - 10800000).toISOString()
        },
        {
          order_id: 1005,
          customer_name: 'Kantin Sekolah',
          total_harga: 300000,
          created_at: new Date(Date.now() - 14400000).toISOString()
        }
      ].slice(0, limit)

      return {
        data: mockOrders,
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

  async getOverviewCardsData(): Promise<{
    product_revenue: OverviewCardData
    weekly_revenue_data: OverviewCardData
    weekly_profit_data: OverviewCardData
    weekly_customers_data: OverviewCardData
  }> {
    try {
      // Mock data for overview cards
      return {
        product_revenue: {
          label: 'Dana Belum Diproses',
          value: 1250000,
          dummy_percentage_change: '+12%',
          dummy_trend: 'up'
        },
        weekly_revenue_data: {
          label: 'Total Revenue (10 Pekan)',
          value: 15000000,
          latest_value: 15000000,
          dummy_percentage_change: '+8%',
          dummy_trend: 'up',
          values: [12000000, 13500000, 11800000, 14200000, 15000000, 13800000, 14500000, 15200000, 14800000, 15000000]
        },
        weekly_profit_data: {
          label: 'Gross Profit (10 Pekan)',
          value: 4500000,
          latest_value: 4500000,
          dummy_percentage_change: '+15%',
          dummy_trend: 'up',
          values: [3600000, 4050000, 3540000, 4260000, 4500000, 4140000, 4350000, 4560000, 4440000, 4500000]
        },
        weekly_customers_data: {
          label: 'Pelanggan Aktif (10 Pekan)',
          value: 45,
          latest_value: 45,
          dummy_percentage_change: '+5%',
          dummy_trend: 'up',
          values: [38, 42, 36, 44, 45, 41, 43, 46, 44, 45]
        }
      }
    } catch (error) {
      return {
        product_revenue: {
          label: 'Dana Belum Diproses',
          value: 0,
          error: getErrorMessage(error)
        },
        weekly_revenue_data: {
          label: 'Total Revenue (10 Pekan)',
          value: 0,
          error: getErrorMessage(error)
        },
        weekly_profit_data: {
          label: 'Gross Profit (10 Pekan)',
          value: 0,
          error: getErrorMessage(error)
        },
        weekly_customers_data: {
          label: 'Pelanggan Aktif (10 Pekan)',
          value: 0,
          error: getErrorMessage(error)
        }
      }
    }
  }

  async updateDeliveryStatus(deliveryIds: number[], status: string): Promise<ApiResponse<null>> {
    try {
      // This would be replaced with actual Supabase update
      console.log('Updating delivery status:', { deliveryIds, status })
      
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
}

export const dashboardService = new DashboardService()