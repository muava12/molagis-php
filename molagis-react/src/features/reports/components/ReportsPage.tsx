import React from 'react'

const ReportsPage: React.FC = () => {
  return (
    <div className="page">
      <div className="page-wrapper">
        <div className="page-header d-print-none">
          <div className="container-xl">
            <div className="row align-items-center">
              <div className="col">
                <h2 className="page-title">Reports</h2>
                <div className="text-muted mt-1">Business reports and analytics</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="page-body">
          <div className="container-xl">
            <div className="row row-cards">
              <div className="col-12">
                <div className="card">
                  <div className="card-body">
                    <h3 className="card-title">Reports</h3>
                    <p className="text-muted">
                      Reports will be implemented here.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportsPage
