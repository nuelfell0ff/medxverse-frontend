import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import API from "../../services/api";
import {
  FiDollarSign, FiSearch, FiLayers, FiCheckCircle,
  FiAlertTriangle, FiClock, FiFilter, FiTrendingUp
} from "react-icons/fi";
import "./AdminPayments.css";

function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | success | pending | failed

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const res = await API.get("/payments/all");

        // 🚨 SAFE DATA EXTRACTION FIX:
        // Handles both object payload { success: true, payments: [...] } and raw array [...]
        const paymentList = Array.isArray(res.data)
          ? res.data
          : res.data?.payments || [];

        setPayments(paymentList);
      } catch (error) {
        console.error("Critical transaction ledger synchronization failure:", error);
        setPayments([]); // Fallback to empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  // Ensure payments is strictly an array before running telemetry calculations
  const safePayments = Array.isArray(payments) ? payments : [];

  // TELEMETRY AGGREGATIONS (Calculated directly from active state memory)
  const totalRevenue = safePayments
    .filter(p => p.status === "success")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const successfulCount = safePayments.filter(p => p.status === "success").length;
  const pendingCount = safePayments.filter(p => p.status === "pending").length;

  // MULTI-TIER LEDGER FILTER ALGORITHM
  const filteredPayments = safePayments.filter(p => {
    const matchesSearch =
      p.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.student?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.course?.title?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // EXACT UNIFORM SYSTEMIC LOADER ACROSS PANELS
  if (loading) {
    return (
      <div className="bx-pm-loading-pane">
        <div className="bx-pm-spinner"></div>
        <p className="mt-3 text-muted font-weight-bold">Compiling Dynamic Platform Telemetry...</p>
      </div>
    );
  }

  return (
    <div className="bx-pm-workspace container-fluid py-4">

      {/* HEADER SECTION CONTROLS */}
      <header className="bx-pm-header d-flex flex-column gap-3 mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div className="bx-pm-title-zone">
            <div className="d-flex align-items-center gap-3">
              <div className="bx-pm-icon-box">
                <FiDollarSign size={24} />
                <span className="bx-pm-pulse-light" />
              </div>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h1 className="h3 mb-0 font-weight-bold">Financial Registry Log</h1>
                  <span className="bx-pm-ver-badge">Ecosystem Ledger</span>
                </div>
                <p className="text-muted mb-0 small">Audit system wide transactions, balance reconciliations, and Paystack parameters.</p>
              </div>
            </div>
          </div>

          {/* DYNAMIC HIGH-CONTRAST SEARCH ELEMENT */}
          <div className="bx-pm-search-wrapper">
            <FiSearch className="bx-pm-search-icon" />
            <input
              type="text"
              placeholder="Search reference string, user, curriculum..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* CORE PLATFORM FINANCIAL METRICS */}
        <div className="row g-3 my-1">
          <div className="col-12 col-md-4">
            <div className="bx-pm-stat-card">
              <span className="bx-pm-stat-label">Gross Ecosystem Revenue</span>
              <div className="d-flex align-items-center justify-content-between mt-1">
                <h2 className="bx-pm-stat-val text-dark mb-0">₦{totalRevenue.toLocaleString()}</h2>
                <div className="bx-pm-stat-icon is-gold"><FiTrendingUp /></div>
              </div>
            </div>
          </div>
          <div className="col-12 col-sm-6 col-md-4">
            <div className="bx-pm-stat-card">
              <span className="bx-pm-stat-label">Verified Transactions</span>
              <div className="d-flex align-items-center justify-content-between mt-1">
                <h2 className="bx-pm-stat-val text-dark mb-0">{successfulCount}</h2>
                <div className="bx-pm-stat-icon is-green"><FiCheckCircle /></div>
              </div>
            </div>
          </div>
          <div className="col-12 col-sm-6 col-md-4">
            <div className="bx-pm-stat-card">
              <span className="bx-pm-stat-label">Unresolved Pipelines</span>
              <div className="d-flex align-items-center justify-content-between mt-1">
                <h2 className="bx-pm-stat-val text-dark mb-0">{pendingCount}</h2>
                <div className="bx-pm-stat-icon is-amber"><FiClock /></div>
              </div>
            </div>
          </div>
        </div>

        {/* FINANCIAL FILTER STRIPS */}
        <div className="bx-pm-filter-bar d-flex align-items-center gap-2 flex-wrap mt-2">
          <div className="bx-pm-filter-label text-muted d-flex align-items-center gap-1 small font-weight-bold">
            <FiFilter size={14} />
            <span>Transaction Filter:</span>
          </div>
          <div className="bx-pm-filter-options d-flex gap-1" style={{ flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All Records" },
              { id: "success", label: "Successful" },
              { id: "pending", label: "Pending Verification" },
              { id: "failed", label: "Failed Parameters" }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`bx-pm-filter-btn ${statusFilter === tab.id ? "is-active" : ""}`}
                onClick={() => setStatusFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* TRANSACTIONAL DATABASE TABLE */}
      <div className="bx-pm-card-panel">
        <div className="table-responsive">
          <table className="bx-pm-table w-100">
            <thead>
              <tr>
                <th>Student Profile Node</th>
                <th>Target Syllabus Module</th>
                <th>Paystack Token Reference</th>
                <th>Transaction Node Value</th>
                <th>Ecosystem Token Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment, idx) => (
                  <motion.tr
                    key={payment._id || idx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                  >
                    <td>
                      <div className="bx-pm-profile-cell">
                        <span className="bx-pm-text-primary d-block">
                          {payment.student?.fullName || "Unregistered Profiling Entity"}
                        </span>
                        <span className="bx-pm-text-secondary text-muted small">
                          {payment.student?.email || "N/A hash"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="bx-pm-text-primary">
                        {payment.course?.title || "Purged Syllabus Node"}
                      </span>
                    </td>
                    <td>
                      <code className="bx-pm-reference-tag">{payment.reference}</code>
                    </td>
                    <td>
                      <span className="bx-pm-text-money">
                        ₦{payment.amount?.toLocaleString() || 0}
                      </span>
                    </td>
                    <td>
                      <span className={`bx-pm-status-pill is-${payment.status}`}>
                        {payment.status}
                      </span>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-5 text-muted small">
                    No matching transactional structures registered on active ecosystem filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default AdminPayments;