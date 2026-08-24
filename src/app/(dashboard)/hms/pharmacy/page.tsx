'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DrugCategory,
  UnitOfMeasure,
  DispenseStatus,
  IInventoryItem,
  IDispenseRecord,
  CreateInventoryItemDTO,
  CreateDispenseRecordDTO,
} from '@/types/pharmacy';

import {
  Pill,
  Plus,
  RefreshCw,
  Search,
  Filter,
  PackageCheck,
  AlertTriangle,
  History,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  PlusCircle,
  MinusCircle,
  CheckCircle2,
  DollarSign,
  UserCheck,
  Loader2
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://medxverse-backend.onrender.com';

interface IPatientResult {
  _id: string;
  firstName: string;
  lastName: string;
  mrn?: string;
  phone?: string;
}

export default function PharmacyPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'dispense'>('inventory');
  
  // Inventory state
  const [inventory, setInventory] = useState<IInventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState<boolean>(true);
  const [inventoryPage, setInventoryPage] = useState<number>(1);
  const [inventoryTotalPages, setInventoryTotalPages] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);

  // Dispense records state
  const [dispenseRecords, setDispenseRecords] = useState<IDispenseRecord[]>([]);
  const [dispenseLoading, setDispenseLoading] = useState<boolean>(true);
  const [dispensePage, setDispensePage] = useState<number>(1);
  const [dispenseTotalPages, setDispenseTotalPages] = useState<number>(1);

  // Feedback states
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal controls
  const [isAddItemOpen, setIsAddItemOpen] = useState<boolean>(false);
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState<boolean>(false);
  const [selectedItemForStock, setSelectedItemForStock] = useState<IInventoryItem | null>(null);
  const [isDispenseOpen, setIsDispenseOpen] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // API Calls
  // ---------------------------------------------------------------------------

  const fetchInventory = useCallback(async () => {
    setInventoryLoading(true);
    setActionError(null);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('page', inventoryPage.toString());
      params.append('limit', '10');
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (lowStockOnly) params.append('isLowStock', 'true');

      const res = await fetch(`${API_BASE_URL}/api/v1/pharmacy/inventory?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setInventory(json.items || []);
        setInventoryTotalPages(json.pages || 1);
      } else {
        setInventory([]);
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      setInventory([]);
    } finally {
      setInventoryLoading(false);
    }
  }, [inventoryPage, searchQuery, selectedCategory, lowStockOnly]);

  const fetchDispenseRecords = useCallback(async () => {
    setDispenseLoading(true);
    setActionError(null);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('page', dispensePage.toString());
      params.append('limit', '10');

      const res = await fetch(`${API_BASE_URL}/api/v1/pharmacy/dispense?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setDispenseRecords(json.records || []);
        setDispenseTotalPages(json.pages || 1);
      } else {
        setDispenseRecords([]);
      }
    } catch (err) {
      console.error('Failed to fetch dispense records:', err);
      setDispenseRecords([]);
    } finally {
      setDispenseLoading(false);
    }
  }, [dispensePage]);

  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchInventory();
    } else {
      fetchDispenseRecords();
    }
  }, [activeTab, fetchInventory, fetchDispenseRecords]);

  // Handle Add Item Submit
  const handleCreateItem = async (dto: CreateInventoryItemDTO) => {
    setActionError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/v1/pharmacy/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dto),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to add item to inventory.');
      }

      setActionSuccess('Drug added to inventory successfully.');
      setIsAddItemOpen(false);
      fetchInventory();
    } catch (err: any) {
      setActionError(err.message || 'Error creating inventory item.');
      throw err;
    }
  };

  // Handle Stock Adjustment Submit
  const handleAdjustStock = async (itemId: string, quantityChange: number, reason?: string) => {
    setActionError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/v1/pharmacy/inventory/${itemId}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantityChange, reason }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to adjust stock.');
      }

      setActionSuccess('Stock adjusted successfully.');
      setIsAdjustStockOpen(false);
      setSelectedItemForStock(null);
      fetchInventory();
    } catch (err: any) {
      setActionError(err.message || 'Error adjusting stock.');
      throw err;
    }
  };

  // Handle Dispense Submit
  const handleDispense = async (dto: CreateDispenseRecordDTO) => {
    setActionError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/v1/pharmacy/dispense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dto),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to process dispense.');
      }

      setActionSuccess('Medication dispensed successfully.');
      setIsDispenseOpen(false);
      if (activeTab === 'dispense') {
        fetchDispenseRecords();
      } else {
        fetchInventory();
      }
    } catch (err: any) {
      setActionError(err.message || 'Error processing dispense.');
      throw err;
    }
  };

  // Computed metrics for stats cards
  const lowStockCount = inventory.filter((i) => i.isLowStock).length;
  const totalItems = inventory.length;

  return (
    <div className="p-6 font-sans w-full mx-auto space-y-6 bg-slate-50/50 min-h-screen">
      
      {/* Action Error Banner */}
      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action Success Banner */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Pharmacy Department</h1>
            <span className="bg-[#e8f5f3] text-[#1b7b68] text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Management
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Manage medication inventory, monitor stock levels, and issue prescriptions to outpatients
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => (activeTab === 'inventory' ? fetchInventory() : fetchDispenseRecords())}
            className="p-3 rounded-2xl border border-slate-100 bg-slate-50 text-slate-500 hover:text-[#1b7b68] hover:bg-[#e8f5f3] transition-all duration-200"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${inventoryLoading || dispenseLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsDispenseOpen(true)}
            className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-wider rounded-2xl shadow-sm hover:shadow transition-all flex items-center gap-2"
          >
            <PackageCheck className="w-4 h-4" /> Dispense Medication
          </button>

          <button
            onClick={() => setIsAddItemOpen(true)}
            className="px-4 py-3 bg-[#1b7b68] hover:bg-[#145f50] text-white text-xs font-bold uppercase tracking-wider rounded-2xl shadow-sm hover:shadow transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add New Drug
          </button>
        </div>
      </div>

      {/* Metric Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Catalog Items</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalItems}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Pill className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Low Stock Alerts</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{lowStockCount}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active View</p>
            <p className="text-lg font-black text-slate-800 mt-1 uppercase">
              {activeTab === 'inventory' ? 'Inventory List' : 'Dispense History'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#e8f5f3] text-[#1b7b68] flex items-center justify-center">
            <History className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Container with Tabs */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Navigation Tabs & Toolbars */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/30">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => { setActiveTab('inventory'); setInventoryPage(1); }}
              className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'inventory' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Drug Inventory
            </button>
            <button
              onClick={() => { setActiveTab('dispense'); setDispensePage(1); }}
              className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'dispense' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Dispense History
            </button>
          </div>

          {activeTab === 'inventory' && (
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, generic, batch..."
                  className="w-full pl-11 pr-4 py-2.5 text-xs rounded-2xl border border-slate-200/80 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68]"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 text-xs font-bold rounded-2xl border border-slate-200/80 bg-white text-slate-700 focus:outline-none focus:border-[#1b7b68]"
                >
                  <option value="ALL">All Categories</option>
                  {Object.values(DrugCategory).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Low Stock Toggle */}
              <button
                onClick={() => setLowStockOnly(!lowStockOnly)}
                className={`px-3.5 py-2 text-xs font-bold rounded-2xl border transition-all ${
                  lowStockOnly
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                Low Stock Only
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Inventory Table */}
        {activeTab === 'inventory' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-4 px-6">Drug Name</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Batch No.</th>
                  <th className="py-4 px-6">Stock Level</th>
                  <th className="py-4 px-6">Unit Price</th>
                  <th className="py-4 px-6">Expiry Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {inventoryLoading ? (
                  <TableSkeleton cols={7} />
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400 font-medium">
                      No inventory items found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  inventory.map((item) => (
                    <tr key={item._id} className="hover:bg-[#e8f5f3]/20 transition-all duration-150">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                        {item.genericName && (
                          <div className="text-[11px] text-slate-400 italic">{item.genericName}</div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-600">{item.batchNumber}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-sm ${item.isLowStock ? 'text-amber-600' : 'text-slate-800'}`}>
                            {item.quantityInStock}
                          </span>
                          <span className="text-[11px] text-slate-400">{item.unitOfMeasure}s</span>
                          {item.isLowStock && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 uppercase">
                              Low
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-800">
                        ${item.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-4 px-6 text-slate-500">
                        {new Date(item.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => {
                            setSelectedItemForStock(item);
                            setIsAdjustStockOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-[#1b7b68] hover:text-white transition-all inline-flex items-center gap-1"
                        >
                          <TrendingDown className="w-3.5 h-3.5" /> Adjust Stock
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30 text-xs">
              <span className="text-slate-400 font-medium">Page {inventoryPage} of {inventoryTotalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={inventoryPage <= 1}
                  onClick={() => setInventoryPage((p) => p - 1)}
                  className="p-2 rounded-xl border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={inventoryPage >= inventoryTotalPages}
                  onClick={() => setInventoryPage((p) => p + 1)}
                  className="p-2 rounded-xl border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Dispense Records Table */}
        {activeTab === 'dispense' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-4 px-6">Patient</th>
                  <th className="py-4 px-6">Items Dispensed</th>
                  <th className="py-4 px-6">Total Amount</th>
                  <th className="py-4 px-6">Dispensed By</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {dispenseLoading ? (
                  <TableSkeleton cols={6} />
                ) : dispenseRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400 font-medium">
                      No dispense records found.
                    </td>
                  </tr>
                ) : (
                  dispenseRecords.map((rec) => (
                    <tr key={rec._id} className="hover:bg-[#e8f5f3]/20 transition-all duration-150">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800">
                          {rec.patientId?.firstName} {rec.patientId?.lastName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          MRN: {rec.patientId?.mrn || 'N/A'}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          {rec.items.map((it, idx) => {
                            const itemName = typeof it.inventoryItemId === 'object' ? it.inventoryItemId.name : 'Drug';
                            return (
                              <div key={idx} className="text-slate-700">
                                <span className="font-medium">{itemName}</span> x{' '}
                                <span className="font-bold">{it.quantity}</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-black text-slate-800">
                        ${rec.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        {rec.dispensedBy?.firstName} {rec.dispensedBy?.lastName}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-400">
                        {new Date(rec.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30 text-xs">
              <span className="text-slate-400 font-medium">Page {dispensePage} of {dispenseTotalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={dispensePage <= 1}
                  onClick={() => setDispensePage((p) => p - 1)}
                  className="p-2 rounded-xl border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={dispensePage >= dispenseTotalPages}
                  onClick={() => setDispensePage((p) => p + 1)}
                  className="p-2 rounded-xl border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddInventoryModal
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        onSubmit={handleCreateItem}
      />

      <AdjustStockModal
        item={selectedItemForStock}
        isOpen={isAdjustStockOpen}
        onClose={() => {
          setIsAdjustStockOpen(false);
          setSelectedItemForStock(null);
        }}
        onSubmit={handleAdjustStock}
      />

      <DispenseModal
        inventory={inventory}
        isOpen={isDispenseOpen}
        onClose={() => setIsDispenseOpen(false)}
        onSubmit={handleDispense}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Component
// ---------------------------------------------------------------------------

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="animate-pulse border-b border-slate-100">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="py-4 px-6">
              <div className="h-4 bg-slate-200 rounded-lg w-24" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Add Inventory Item Modal
// ---------------------------------------------------------------------------

function AddInventoryModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateInventoryItemDTO) => Promise<void>;
}) {
  const [formData, setFormData] = useState<CreateInventoryItemDTO>({
    name: '',
    genericName: '',
    category: DrugCategory.ANTIBIOTICS,
    batchNumber: '',
    unitPrice: 0,
    quantityInStock: 0,
    reorderLevel: 10,
    unitOfMeasure: UnitOfMeasure.TABLET,
    expiryDate: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create inventory item.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-lg font-black text-slate-800">Add New Inventory Item</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Brand Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Amoxil"
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-[#1b7b68] outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Generic Name</label>
              <input
                type="text"
                value={formData.genericName}
                onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                placeholder="e.g. Amoxicillin"
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-[#1b7b68] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as DrugCategory })}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-[#1b7b68] outline-none bg-white"
              >
                {Object.values(DrugCategory).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Unit of Measure</label>
              <select
                value={formData.unitOfMeasure}
                onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value as UnitOfMeasure })}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-[#1b7b68] outline-none bg-white"
              >
                {Object.values(UnitOfMeasure).map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Batch Number *</label>
              <input
                type="text"
                required
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                placeholder="BATCH-123"
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-[#1b7b68] outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Unit Price ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-[#1b7b68] outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Initial Stock *</label>
              <input
                type="number"
                min="0"
                required
                value={formData.quantityInStock}
                onChange={(e) => setFormData({ ...formData, quantityInStock: parseInt(e.target.value) || 0 })}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-[#1b7b68] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Reorder Level</label>
              <input
                type="number"
                min="0"
                value={formData.reorderLevel}
                onChange={(e) => setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 0 })}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-[#1b7b68] outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Expiry Date *</label>
              <input
                type="date"
                required
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-[#1b7b68] outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-[#1b7b68] hover:bg-[#145f50] text-white font-bold disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Adjust Stock Modal
// ---------------------------------------------------------------------------

function AdjustStockModal({
  item,
  isOpen,
  onClose,
  onSubmit,
}: {
  item: IInventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (itemId: string, quantityChange: number, reason?: string) => Promise<void>;
}) {
  const [quantityChange, setQuantityChange] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit(item._id, quantityChange, reason);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Stock adjustment failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-800">Adjust Stock Level</h2>
            <p className="text-xs text-slate-400 font-medium">{item.name} ({item.batchNumber})</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-2xl flex justify-between items-center text-slate-700">
            <span>Current Stock:</span>
            <span className="font-black text-slate-800 text-sm">{item.quantityInStock} {item.unitOfMeasure}s</span>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Quantity Change (Positive to Add, Negative to Deduct) *
            </label>
            <input
              type="number"
              required
              value={quantityChange}
              onChange={(e) => setQuantityChange(parseInt(e.target.value) || 0)}
              placeholder="e.g. 50 or -10"
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-[#1b7b68] outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Reason / Note</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. New delivery shipment, Damaged stock adjustment"
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-[#1b7b68] outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-[#1b7b68] hover:bg-[#145f50] text-white font-bold disabled:opacity-50"
            >
              {loading ? 'Adjusting...' : 'Confirm Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dispense Medication Modal with Live Patient Search
// ---------------------------------------------------------------------------

function DispenseModal({
  inventory,
  isOpen,
  onClose,
  onSubmit,
}: {
  inventory: IInventoryItem[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateDispenseRecordDTO) => Promise<void>;
}) {
  const [selectedPatient, setSelectedPatient] = useState<IPatientResult | null>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState<string>('');
  const [patientResults, setPatientResults] = useState<IPatientResult[]>([]);
  const [searchingPatient, setSearchingPatient] = useState<boolean>(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState<boolean>(false);

  const [consultationId, setConsultationId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ inventoryItemId: string; quantity: number }[]>([
    { inventoryItemId: '', quantity: 1 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPatientDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced live patient search
  useEffect(() => {
    if (!patientSearchTerm.trim() || selectedPatient) {
      setPatientResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingPatient(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${API_BASE_URL}/api/v1/patients?search=${encodeURIComponent(patientSearchTerm)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const json = await res.json();
          setPatientResults(json.patients || json.data || json || []);
          setShowPatientDropdown(true);
        }
      } catch (err) {
        console.error('Failed to search patients:', err);
      } finally {
        setSearchingPatient(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearchTerm, selectedPatient]);

  if (!isOpen) return null;

  const handleSelectPatient = (patient: IPatientResult) => {
    setSelectedPatient(patient);
    setPatientSearchTerm(`${patient.firstName} ${patient.lastName}`);
    setShowPatientDropdown(false);
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setPatientSearchTerm('');
    setPatientResults([]);
  };

  const handleAddItem = () => {
    setItems([...items, { inventoryItemId: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'inventoryItemId' | 'quantity', value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!selectedPatient?._id) {
      setError('Please search and select a patient.');
      setLoading(false);
      return;
    }

    const validItems = items.filter((i) => i.inventoryItemId && i.quantity > 0);
    if (validItems.length === 0) {
      setError('Please select at least one drug to dispense.');
      setLoading(false);
      return;
    }

    try {
      await onSubmit({
        patientId: selectedPatient._id,
        consultationId: consultationId.trim() || undefined,
        items: validItems,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Dispense failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-lg font-black text-slate-800">Dispense Medication</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            {/* Live Patient Search Input */}
            <div className="relative" ref={dropdownRef}>
              <label className="font-bold text-slate-700 block mb-1">Search Patient *</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={patientSearchTerm}
                  onChange={(e) => {
                    setPatientSearchTerm(e.target.value);
                    if (selectedPatient) setSelectedPatient(null);
                  }}
                  placeholder="Type patient name, phone, MRN..."
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 focus:border-[#1b7b68] outline-none"
                />
                {searchingPatient ? (
                  <Loader2 className="w-4 h-4 absolute right-3 top-3 text-slate-400 animate-spin" />
                ) : selectedPatient ? (
                  <button
                    type="button"
                    onClick={handleClearPatient}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}
              </div>

              {/* Selected Patient Status Badge */}
              {selectedPatient && (
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-600 font-bold">
                  <UserCheck className="w-3.5 h-3.5" /> Selected: {selectedPatient.firstName} {selectedPatient.lastName} ({selectedPatient.mrn || 'No MRN'})
                </div>
              )}

              {/* Search Results Dropdown */}
              {showPatientDropdown && patientResults.length > 0 && (
                <div className="absolute z-20 w-full bg-white border border-slate-200 mt-1 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {patientResults.map((patient) => (
                    <div
                      key={patient._id}
                      onClick={() => handleSelectPatient(patient)}
                      className="p-2.5 hover:bg-[#e8f5f3]/50 cursor-pointer flex justify-between items-center transition-colors"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{patient.firstName} {patient.lastName}</p>
                        <p className="text-[10px] text-slate-400">{patient.phone || 'No Phone'}</p>
                      </div>
                      <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">
                        {patient.mrn || 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Consultation ID (Optional)</label>
              <input
                type="text"
                value={consultationId}
                onChange={(e) => setConsultationId(e.target.value)}
                placeholder="24-char Consultation ID"
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-[#1b7b68] outline-none font-mono"
              />
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="font-bold text-slate-700">Drugs to Dispense *</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-[#1b7b68] hover:underline flex items-center gap-1"
              >
                <PlusCircle className="w-4 h-4" /> Add Item
              </button>
            </div>

            {items.map((it, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl">
                <select
                  required
                  value={it.inventoryItemId}
                  onChange={(e) => handleItemChange(idx, 'inventoryItemId', e.target.value)}
                  className="flex-1 p-2 rounded-xl border border-slate-200 bg-white outline-none"
                >
                  <option value="">Select Drug...</option>
                  {inventory.map((inv) => (
                    <option key={inv._id} value={inv._id} disabled={inv.quantityInStock <= 0}>
                      {inv.name} (In stock: {inv.quantityInStock}) - ${inv.unitPrice}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  required
                  value={it.quantity}
                  onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                  className="w-20 p-2 rounded-xl border border-slate-200 bg-white text-center outline-none"
                />

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 text-rose-500 hover:text-rose-700"
                  >
                    <MinusCircle className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Notes / Instructions</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Take 1 tablet twice daily after meals"
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-[#1b7b68] outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Dispense Drugs'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}