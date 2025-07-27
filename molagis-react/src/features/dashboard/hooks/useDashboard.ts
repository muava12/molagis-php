import { useState, useEffect } from 'react'
import { dashboardService, DeliveryItem, DashboardStatistics, OverviewCardData, RecentOrder } from '../services/dashboardService'
import { formatDate } from '@/utils/helpers'

export const useDashboard = () => {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([])
  const [statistics, setStatistics] = useState<DashboardStatistics | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [overviewCards, setOverviewCards] = useState<{
    product_revenue: OverviewCardData
    weekly_revenue_data: OverviewCardData
    weekly_profit_data: OverviewCardData
    weekly_customers_data: OverviewCardData
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date(), 'yyyy-MM-dd'))

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [deliveriesResult, statisticsResult, recentOrdersResult, overviewCardsData] = await Promise.all([
        dashboardService.getDeliveries(selectedDate),
        dashboardService.getDashboardStatistics(),
        dashboardService.getRecentOrders(5),
        dashboardService.getOverviewCardsData()
      ])

      if (deliveriesResult.success && deliveriesResult.data) {
        setDeliveries(deliveriesResult.data)
      } else if (deliveriesResult.error) {
        setError(deliveriesResult.error)
      }

      if (statisticsResult.success && statisticsResult.data) {
        setStatistics(statisticsResult.data)
      } else if (statisticsResult.error) {
        setError(statisticsResult.error)
      }

      if (recentOrdersResult.success && recentOrdersResult.data) {
        setRecentOrders(recentOrdersResult.data)
      } else if (recentOrdersResult.error) {
        setError(recentOrdersResult.error)
      }

      setOverviewCards(overviewCardsData)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data dashboard')
    } finally {
      setLoading(false)
    }
  }

  const updateDeliveryStatus = async (deliveryIds: number[], status: string) => {
    try {
      const result = await dashboardService.updateDeliveryStatus(deliveryIds, status)
      if (result.success) {
        // Reload deliveries data
        const deliveriesResult = await dashboardService.getDeliveries(selectedDate)
        if (deliveriesResult.success && deliveriesResult.data) {
          setDeliveries(deliveriesResult.data)
        }
        return { success: true, error: null }
      } else {
        return { success: false, error: result.error }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengupdate status pengantaran'
      return { success: false, error: errorMessage }
    }
  }

  const refreshData = () => {
    loadDashboardData()
  }

  const changeDate = (newDate: string) => {
    setSelectedDate(newDate)
  }

  useEffect(() => {
    loadDashboardData()
  }, [selectedDate])

  return {
    deliveries,
    statistics,
    recentOrders,
    overviewCards,
    loading,
    error,
    selectedDate,
    updateDeliveryStatus,
    refreshData,
    changeDate
  }
}