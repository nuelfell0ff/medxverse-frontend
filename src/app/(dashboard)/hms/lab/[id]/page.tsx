"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FlaskConical,
  ArrowLeft,
  Printer,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Send,
} from "lucide-react";

const API_BASE_URL = "https://medxverse-backend.onrender.com";

interface LabResultField {
  parameter: string;
  value: string;
  unit: string;
  referenceRange: string;
  isAbnormal?: boolean;
}

interface LabOrderDetail {
  _id: string;
  patientName: string;
  patientId: string;
  testName: string;
  category: string;
  priority: "ROUTINE" | "URGENT" | "STAT";
  status: "PENDING" | "SAMPLE_COLLECTED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  specimenType: string;
  orderedBy: string;
  createdAt: string;
  results?: LabResultField[];
  notes?: string;
  rejectionReason?: string;
}

export default function LabOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [order, setOrder] = useState<LabOrderDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Fetch Order Details by ID
  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/lab/orders/${id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setOrder(data.data);
      } else {
        setError(data.message || "Failed to load order details.");
      }
    } catch (err) {
      setError("Network error connecting to backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchOrderDetails();
  }, [id]);

  // Update Status Endpoint
  const handleStatusChange = async (newStatus: string, payload: object = {}) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/lab/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...payload }),
      });
      const data = await res.json();
      if (data.success) {
        setShowRejectInput(false);
        fetchOrderDetails();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        <FlaskConical className="w-8 h-8 animate-bounce mx-auto mb-2 text-teal-600" />
        Loading laboratory test detail...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Worklist
        </button>
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error || "Laboratory order record not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Navigation & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-teal-600 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Laboratory Worklist
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <Printer className="w-4 h-4" /> Print Lab Report
          </button>
        </div>
      </div>

      {/* Main Printable Container */}
      <div id="printable-report" className="space-y-6 bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        {/* Report Header */}
        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-teal-600" />
              Diagnostic Test Report
            </h1>
            <p className="text-xs text-slate-400 mt-1">Order ID: {order._id}</p>
          </div>

          <div className="text-right">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                order.status === "COMPLETED"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : order.status === "REJECTED"
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
              }`}
            >
              {order.status.replace("_", " ")}
            </span>
            <p className="text-xs text-slate-400 mt-2">
              Ordered On: {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Patient & Test Information Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase">Patient Information</h3>
            <p className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-teal-600" /> {order.patientName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Patient ID: {order.patientId}</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase">Test Details</h3>
            <p className="text-sm font-medium text-slate-800 dark:text-white">{order.testName}</p>
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span>Category: {order.category}</span>
              <span>Specimen: {order.specimenType}</span>
              <span>Priority: {order.priority}</span>
            </div>
          </div>
        </div>

        {/* Action Controls for Specimen Workflow */}
        {order.status !== "COMPLETED" && order.status !== "REJECTED" && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
              Specimen Accessioning Controls
            </h4>

            <div className="flex flex-wrap gap-3">
              {order.status === "PENDING" && (
                <button
                  onClick={() => handleStatusChange("SAMPLE_COLLECTED")}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium transition"
                >
                  Mark Specimen Collected
                </button>
              )}

              {order.status === "SAMPLE_COLLECTED" && (
                <button
                  onClick={() => handleStatusChange("IN_PROGRESS")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
                >
                  Begin Processing
                </button>
              )}

              <button
                onClick={() => setShowRejectInput(!showRejectInput)}
                className="px-4 py-2 bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300 rounded-lg text-xs font-medium transition"
              >
                Reject Specimen
              </button>
            </div>

            {showRejectInput && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <input
                  type="text"
                  placeholder="Reason for rejection (e.g. Hemolyzed sample)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="flex-1 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-slate-100"
                />
                <button
                  onClick={() => handleStatusChange("REJECTED", { rejectionReason: rejectReason })}
                  className="px-3 py-2 bg-rose-600 text-white rounded text-xs font-medium hover:bg-rose-700"
                >
                  Submit Rejection
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <FileText className="w-4 h-4 text-teal-600" /> Laboratory Findings & Results
          </h3>

          {order.results && order.results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    <th className="p-3">Parameter</th>
                    <th className="p-3">Observed Value</th>
                    <th className="p-3">Unit</th>
                    <th className="p-3">Reference Range</th>
                    <th className="p-3">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {order.results.map((res, i) => (
                    <tr key={i}>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{res.parameter}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{res.value}</td>
                      <td className="p-3 text-slate-500">{res.unit}</td>
                      <td className="p-3 text-slate-500">{res.referenceRange}</td>
                      <td className="p-3">
                        {res.isAbnormal ? (
                          <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5" /> Abnormal
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-600 font-medium">Normal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic p-4 bg-slate-50 dark:bg-slate-800/20 rounded-lg text-center">
              No results recorded for this test order yet.
            </p>
          )}
        </div>

        {/* Sign-off Footer */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-end text-xs text-slate-400">
          <div>
            <p>Ordered By: {order.orderedBy || "Attending Physician"}</p>
            <p>MedxVerse Hospital Information System</p>
          </div>
          <div className="flex items-center gap-1 text-teal-600 font-medium">
            <ShieldCheck className="w-4 h-4" /> Digitally Verified
          </div>
        </div>
      </div>
    </div>
  );
}