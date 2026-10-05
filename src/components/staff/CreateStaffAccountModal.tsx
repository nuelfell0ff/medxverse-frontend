'use client';

import { useState, type FormEvent } from 'react';
import { KeyRound, Lock, X } from 'lucide-react';

interface CreateStaffAccountModalProps {
  staff: {
    _id: string;
    firstName: string;
    lastName: string;
    staffId: string;
    email?: string;
    userAccountId?: string;
  };
  saving: boolean;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
}

export default function CreateStaffAccountModal({
  staff,
  saving,
  onClose,
  onSubmit,
}: CreateStaffAccountModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!staff.email?.trim()) {
      setError('This staff member does not have an email address. Add an email to the staff profile first.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])/.test(password)) {
      setError('Use at least one uppercase letter, one lowercase letter, one number, and one special character.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    await onSubmit(password);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Create Staff Login</h2>
              <p className="text-xs text-slate-400">No email invitation is required.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 p-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <p className="text-sm font-bold text-slate-800">{staff.firstName} {staff.lastName}</p>
            <p className="mt-0.5 text-xs text-slate-500">{staff.staffId}</p>
            <p className="mt-1 text-xs text-slate-500">Login email: <span className="font-semibold text-slate-700">{staff.email || 'No email added'}</span></p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
            <p className="text-xs leading-5 text-amber-800">
              The password you enter here will be the staff member's login password. Give it to the staff member securely.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Password <span className="text-rose-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter a strong password"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-20 text-sm outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/10"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#1b7b68]">
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">8+ characters, uppercase, lowercase, number and special character.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Confirm Password <span className="text-rose-500">*</span></label>
            <input
              required
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Enter the password again"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/10"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs leading-5 text-rose-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-xl bg-[#1b7b68] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? 'Creating account...' : 'Create Login Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
