import React from 'react'
import { useDashboard } from '../hooks/useDashboard'
import LoadingSpinner from '@/components/common/Loading/LoadingSpinner'
import { formatCurrency, formatDate, formatTime } from '@/utils/helpers'

const DashboardPage: React.FC = () => {
  const {
    deliveries,
    statistics,
    recentOrders,
    overviewCards,
    loading,
    error,
    selectedDate,
    changeDate,
    refreshData
  } = useDashboard()

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="container-xl">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-title">Error!</h4>
          <div className="text-secondary">{error}</div>
          <div className="btn-list mt-3">
            <button className="btn btn-primary" onClick={refreshData}>
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrapper">
      <div className="page-header d-print-none">
        <div className="container-xl">
          <div className="row g-2 align-items-center">
            <div className="col">
              <h2 className="page-title">Dashboard</h2>
              <div className="text-secondary mt-1">
                Ringkasan bisnis dan aktivitas hari ini
              </div>
            </div>
            <div className="col-auto ms-auto d-print-none">
              <div className="btn-list">
                <input
                  type="date"
                  className="form-control"
                  value={selectedDate}
                  onChange={(e) => changeDate(e.target.value)}
                />
                <button className="btn btn-primary" onClick={refreshData}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4"/>
                    <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="container-xl">
          {/* Statistics Cards */}
          {statistics && (
            <div className="row row-deck row-cards mb-4">
              <div className="col-sm-6 col-lg-4">
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="subheader">Total Pesanan Hari Ini</div>
                    </div>
                    <div className="h1 mb-3">{statistics.total_orders_today}</div>
                    <div className="d-flex mb-2">
                      <div className="flex-fill">
                        <div className="progress progress-sm">
                          <div className="progress-bar bg-primary" style={{width: '75%'}} role="progressbar"></div>
                        </div>
                      </div>
                      <div className="ms-2">
                        <small className="text-secondary">75%</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-sm-6 col-lg-4">
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="subheader">Revenue Hari Ini</div>
                    </div>
                    <div className="h1 mb-3">{formatCurrency(statistics.total_revenue_today)}</div>
                    <div className="d-flex mb-2">
                      <div className="flex-fill">
                        <div className="progress progress-sm">
                          <div className="progress-bar bg-success" style={{width: '60%'}} role="progressbar"></div>
                        </div>
                      </div>
                      <div className="ms-2">
                        <small className="text-secondary">60%</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-sm-6 col-lg-4">
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="subheader">Pengantaran Pending</div>
                    </div>
                    <div className="h1 mb-3">{statistics.pending_deliveries_today}</div>
                    <div className="d-flex mb-2">
                      <div className="flex-fill">
                        <div className="progress progress-sm">
                          <div className="progress-bar bg-warning" style={{width: '25%'}} role="progressbar"></div>
                        </div>
                      </div>
                      <div className="ms-2">
                        <small className="text-secondary">25%</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Overview Cards */}
          {overviewCards && (
            <div className="row row-deck row-cards mb-4">
              <div className="col-sm-6 col-lg-3">
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="subheader">{overviewCards.product_revenue.label}</div>
                      <div className="ms-auto">
                        {overviewCards.product_revenue.dummy_trend === 'up' && (
                          <span className="text-green d-inline-flex align-items-center lh-1">
                            {overviewCards.product_revenue.dummy_percentage_change}
                            <svg xmlns="http://www.w3.org/2000/svg" className="icon ms-1" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                              <polyline points="3,17 9,11 13,15 21,7"/>
                              <polyline points="14,7 21,7 21,14"/>
                            </svg>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h1 mb-3">{formatCurrency(overviewCards.product_revenue.value)}</div>
                  </div>
                </div>
              </div>
              <div className="col-sm-6 col-lg-3">
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="subheader">{overviewCards.weekly_revenue_data.label}</div>
                      <div className="ms-auto">
                        <span className="text-green d-inline-flex align-items-center lh-1">
                          {overviewCards.weekly_revenue_data.dummy_percentage_change}
                          <svg xmlns="http://www.w3.org/2000/svg" className="icon ms-1" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <polyline points="3,17 9,11 13,15 21,7"/>
                            <polyline points="14,7 21,7 21,14"/>
                          </svg>
                        </span>
                      </div>
                    </div>
                    <div className="h1 mb-3">{formatCurrency(overviewCards.weekly_revenue_data.value)}</div>
                  </div>
                </div>
              </div>
              <div className="col-sm-6 col-lg-3">
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="subheader">{overviewCards.weekly_profit_data.label}</div>
                      <div className="ms-auto">
                        <span className="text-green d-inline-flex align-items-center lh-1">
                          {overviewCards.weekly_profit_data.dummy_percentage_change}
                          <svg xmlns="http://www.w3.org/2000/svg" className="icon ms-1" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <polyline points="3,17 9,11 13,15 21,7"/>
                            <polyline points="14,7 21,7 21,14"/>
                          </svg>
                        </span>
                      </div>
                    </div>
                    <div className="h1 mb-3">{formatCurrency(overviewCards.weekly_profit_data.value)}</div>
                  </div>
                </div>
              </div>
              <div className="col-sm-6 col-lg-3">
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="subheader">{overviewCards.weekly_customers_data.label}</div>
                      <div className="ms-auto">
                        <span className="text-green d-inline-flex align-items-center lh-1">
                          {overviewCards.weekly_customers_data.dummy_percentage_change}
                          <svg xmlns="http://www.w3.org/2000/svg" className="icon ms-1" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <polyline points="3,17 9,11 13,15 21,7"/>
                            <polyline points="14,7 21,7 21,14"/>
                          </svg>
                        </span>
                      </div>
                    </div>
                    <div className="h1 mb-3">{overviewCards.weekly_customers_data.value}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="row row-deck row-cards">
            {/* Delivery Status */}
            <div className="col-12 col-lg-8">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Status Pengantaran - {formatDate(new Date(selectedDate), 'dd MMMM yyyy')}</h3>
                </div>
                <div className="card-body">
                  {deliveries.length === 0 ? (
                    <div className="empty">
                      <div className="empty-img">
                        <img src="/images/icons/delivery.svg" height="128" alt="No deliveries" />
                      </div>
                      <p className="empty-title">Tidak ada pengantaran</p>
                      <p className="empty-subtitle text-secondary">
                        Belum ada pengantaran untuk tanggal yang dipilih.
                      </p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-vcenter">
                        <thead>
                          <tr>
                            <th>Kurir</th>
                            <th>Total Pengantaran</th>
                            <th>Selesai</th>
                            <th>Progress</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deliveries.map((delivery, index) => {
                            const progress = delivery.jumlah_pengantaran > 0 
                              ? (delivery.jumlah_selesai / delivery.jumlah_pengantaran) * 100 
                              : 0
                            const isComplete = delivery.jumlah_selesai === delivery.jumlah_pengantaran
                            
                            return (
                              <tr key={index}>
                                <td>
                                  <div className="d-flex py-1 align-items-center">
                                    <span className="avatar me-2">
                                      {delivery.courier_name.charAt(0).toUpperCase()}
                                    </span>
                                    <div className="flex-fill">
                                      <div className="font-weight-medium">{delivery.courier_name}</div>
                                      {delivery.kurir_id && (
                                        <div className="text-secondary">
                                          <small>ID: {delivery.kurir_id}</small>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className="badge badge-outline text-blue">
                                    {delivery.jumlah_pengantaran}
                                  </span>
                                </td>
                                <td>
                                  <span className="badge badge-outline text-green">
                                    {delivery.jumlah_selesai}
                                  </span>
                                </td>
                                <td>
                                  <div className="progress progress-sm">
                                    <div 
                                      className={`progress-bar ${isComplete ? 'bg-success' : 'bg-primary'}`}
                                      style={{width: `${progress}%`}}
                                      role="progressbar"
                                    ></div>
                                  </div>
                                  <small className="text-secondary">{Math.round(progress)}%</small>
                                </td>
                                <td>
                                  {isComplete ? (
                                    <span className="badge bg-success">Selesai</span>
                                  ) : delivery.jumlah_selesai > 0 ? (
                                    <span className="badge bg-warning">Dalam Proses</span>
                                  ) : (
                                    <span className="badge bg-secondary">Belum Mulai</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="col-12 col-lg-4">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Pesanan Terbaru</h3>
                </div>
                <div className="card-body">
                  {recentOrders.length === 0 ? (
                    <div className="empty">
                      <p className="empty-title">Tidak ada pesanan</p>
                      <p className="empty-subtitle text-secondary">
                        Belum ada pesanan terbaru.
                      </p>
                    </div>
                  ) : (
                    <div className="list-group list-group-flush">
                      {recentOrders.map((order) => (
                        <div key={order.order_id} className="list-group-item">
                          <div className="row align-items-center">
                            <div className="col-auto">
                              <span className="status-dot status-dot-animated bg-green d-block"></span>
                            </div>
                            <div className="col text-truncate">
                              <a href="#" className="text-body d-block">#{order.order_id}</a>
                              <div className="d-block text-secondary text-truncate mt-n1">
                                {order.customer_name}
                              </div>
                            </div>
                            <div className="col-auto">
                              <div className="text-end">
                                <div className="text-green">{formatCurrency(order.total_harga)}</div>
                                <div className="text-secondary">
                                  {formatTime(new Date(order.created_at))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage