'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Phone,
  Mail,
  Building2,
  Award,
  Edit,
  Power,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  Pill,
  TestTube,
  Receipt,
  UserCheck,
} from 'lucide-react';

import { StaffApiService } from '@/services/staff.service';
import { IStaff, StaffRole, CreateStaffDTO, UpdateStaffDTO } from '@/types/staff';

export default function StaffPage() {
  const [staffList, setStaffList] = useState<IStaff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<IStaff | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState<CreateStaffDTO>({
    firstName: '',
    lastName: '',
    role: StaffRole.DOCTOR,
    department: '',
    licenseNumber: '',
    phone: '',
    email: '',
  });

  // Fetch Staff List
  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: any = {};
      if (selectedRole !== 'ALL') filters.role = selectedRole;
      if (search.trim()) filters.search = search.trim();
      if (statusFilter !== 'ALL') filters.isActive = statusFilter === 'active';

      const res = await StaffApiService.getStaff(filters);
      setStaffList(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch staff members');
    } finally {
      setLoading(false);
    }
  }, [selectedRole, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStaff();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadStaff]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await StaffApiService.createStaff(form);
      setIsAddModalOpen(false);
      resetForm();
      loadStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to create staff member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setSubmitting(true);
    try {
      const updatePayload: UpdateStaffDTO = { ...form };
      await StaffApiService.updateStaff(editingStaff._id, updatePayload);
      setIsEditModalOpen(false);
      setEditingStaff(null);
      resetForm();
      loadStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to update staff member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await StaffApiService.toggleStaffStatus(id);
      loadStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to change staff status');
    }
  };

  const openEditModal = (staff: IStaff) => {
    setEditingStaff(staff);
    setForm({
      firstName: staff.firstName,
      lastName: staff.lastName,
      role: staff.role,
      department: staff.department || '',
      licenseNumber: staff.licenseNumber || '',
      phone: staff.phone || '',
      email: staff.email || '',
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setForm({
      firstName: '',
      lastName: '',
      role: StaffRole.DOCTOR,
      department: '',
      licenseNumber: '',
      phone: '',
      email: '',
    });
  };

  const getRoleIcon = (role: StaffRole) => {
    switch (role) {
      case StaffRole.DOCTOR:
        return <Stethoscope className="w-3.5 h-3.5 text-blue-600" />;
      case StaffRole.NURSE:
        return <HeartPulse className="w-3.5 h-3.5 text-rose-600" />;
      case StaffRole.PHARMACIST:
        return <Pill className="w-3.5 h-3.5 text-emerald-600" />;
      case StaffRole.LAB_TECH:
        return <TestTube className="w-3.5 h-3.5 text-purple-600" />;
      case StaffRole.ACCOUNTANT:
        return <Receipt className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <UserCheck className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const getRoleBadge = (role: StaffRole) => {
    const roleColors: Record<StaffRole, string> = {
      [StaffRole.DOCTOR]: 'bg-blue-50 text-blue-700 border-blue-200',
      [StaffRole.NURSE]: 'bg-rose-50 text-rose-700 border-rose-200',
      [StaffRole.PHARMACIST]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      [StaffRole.LAB_TECH]: 'bg-purple-50 text-purple-700 border-purple-200',
      [StaffRole.RECEPTIONIST]: 'bg-sky-50 text-sky-700 border-sky-200',
      [StaffRole.ACCOUNTANT]: 'bg-amber-50 text-amber-700 border-amber-200',
      [StaffRole.OTHER]: 'bg-slate-50 text-slate-700 border-slate-200',
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
          roleColors[role] || 'bg-slate-50 text-slate-700 border-slate-200'
        }`}
      >
        {getRoleIcon(role)}
        <span>{role.replace('_', ' ')}</span>
      </span>
    );
  };

  // Stats Counters
  const totalStaff = staffList.length;
  const activeStaff = staffList.filter((s) => s.isActive).length;
  const doctorCount = staffList.filter((s) => s.role === StaffRole.DOCTOR).length;
  const nurseCount = staffList.filter((s) => s.role === StaffRole.NURSE).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hospital Staff</h1>
          <p className="text-sm text-slate-500">Manage clinical, administrative, and operations personnel</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1b7b68] hover:bg-[#156354] text-white font-semibold rounded-2xl shadow-sm transition-all text-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Staff</span>
        </button>
      </div>

      {/* Metrics Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Staff</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalStaff}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Staff</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{activeStaff}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Doctors</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{doctorCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Stethoscope className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Nurses</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{nurseCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <HeartPulse className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, department, or license..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#1b7b68]"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#1b7b68]"
          >
            <option value="ALL">All Roles</option>
            {Object.values(StaffRole).map((role) => (
              <option key={role} value={role}>
                {role.replace('_', ' ')}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#1b7b68]"
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <button
            onClick={loadStaff}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading staff members...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm font-medium">{error}</div>
        ) : staffList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No staff members found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4 font-semibold">Staff Member</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Department</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold">License #</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.map((staff) => (
                  <tr key={staff._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {staff.firstName} {staff.lastName}
                    </td>
                    <td className="px-6 py-4">{getRoleBadge(staff.role)}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {staff.department ? (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {staff.department}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      {staff.phone && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{staff.phone}</span>
                        </div>
                      )}
                      {staff.email && (
                        <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{staff.email}</span>
                        </div>
                      )}
                      {!staff.phone && !staff.email && <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-600">
                      {staff.licenseNumber ? (
                        <span className="inline-flex items-center gap-1">
                          <Award className="w-3 h-3 text-slate-400" />
                          {staff.licenseNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {staff.isActive ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(staff)}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all"
                        title="Edit Staff"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(staff._id)}
                        className={`p-1.5 rounded-lg transition-all ${
                          staff.isActive
                            ? 'hover:bg-rose-50 text-rose-600'
                            : 'hover:bg-emerald-50 text-emerald-600'
                        }`}
                        title={staff.isActive ? 'Deactivate Staff' : 'Activate Staff'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Staff Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <h2 className="text-lg font-bold text-slate-900">
              {isEditModalOpen ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h2>

            <form
              onSubmit={isEditModalOpen ? handleEditSubmit : handleCreateSubmit}
              className="space-y-4 text-xs"
            >
              {/* Names */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1b7b68]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1b7b68]"
                  />
                </div>
              </div>

              {/* Role & Department */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role *</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1b7b68]"
                  >
                    {Object.values(StaffRole).map((r) => (
                      <option key={r} value={r}>
                        {r.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Cardiology, ER"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1b7b68]"
                  />
                </div>
              </div>

              {/* License Number */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">License Number</label>
                <input
                  type="text"
                  placeholder="Medical/Nursing Board License"
                  value={form.licenseNumber}
                  onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1b7b68]"
                />
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+234..."
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1b7b68]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="staff@hospital.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1b7b68]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                    setEditingStaff(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#1b7b68] text-white rounded-xl font-bold hover:bg-[#156354]"
                >
                  {submitting ? 'Saving...' : isEditModalOpen ? 'Save Changes' : 'Create Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}