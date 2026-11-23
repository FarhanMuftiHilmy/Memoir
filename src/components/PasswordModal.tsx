import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Lock, ShieldCheck, X } from 'lucide-react';
import { generateSalt, hashPassword, verifyPassword } from '../utils/crypto';

export type PasswordModalMode = 'unlock' | 'setup' | 'manage';

interface PasswordModalProps {
  mode: PasswordModalMode;
  lockHash: string;
  lockSalt: string;
  autoLockMinutes: number;
  onUnlockSuccess: () => void;
  onSavePasswordConfig: (newHash: string, newSalt: string, autoLockMinutes: number) => void;
  onClose: () => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  mode,
  lockHash,
  lockSalt,
  autoLockMinutes,
  onUnlockSuccess,
  onSavePasswordConfig,
  onClose,
}) => {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [timeoutMin, setTimeoutMin] = useState(autoLockMinutes);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (mode === 'unlock') {
        const ok = await verifyPassword(currentPw, lockSalt, lockHash);
        if (!ok) {
          setError('Incorrect master password. Please try again.');
          setBusy(false);
          return;
        }
        onUnlockSuccess();
        onClose();
        return;
      }

      if (mode === 'manage' && lockHash) {
        const ok = await verifyPassword(currentPw, lockSalt, lockHash);
        if (!ok) {
          setError('Current password does not match.');
          setBusy(false);
          return;
        }
        // If user leaves newPw empty in manage mode, only update auto-lock timer
        if (!newPw.trim()) {
          onSavePasswordConfig(lockHash, lockSalt, timeoutMin);
          onClose();
          return;
        }
      }

      if (newPw.length < 4) {
        setError('Password must be at least 4 characters.');
        setBusy(false);
        return;
      }

      if (newPw !== confirmPw) {
        setError('Passwords do not match.');
        setBusy(false);
        return;
      }

      const salt = generateSalt();
      const digest = await hashPassword(newPw, salt);
      onSavePasswordConfig(digest, salt, timeoutMin);
      onUnlockSuccess();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveLock = async () => {
    setError('');
    if (!currentPw) {
      setError('Enter your current password to remove vault protection.');
      return;
    }
    setBusy(true);
    try {
      const ok = await verifyPassword(currentPw, lockSalt, lockHash);
      if (!ok) {
        setError('Incorrect current password.');
        setBusy(false);
        return;
      }
      onSavePasswordConfig('', '', 15);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#181A1F] shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Password Protection"
      >
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {mode === 'unlock' ? (
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
            <h2 className="font-display text-base font-semibold text-stone-900 dark:text-stone-100">
              {mode === 'unlock'
                ? 'Unlock Protected Notes'
                : mode === 'setup'
                  ? 'Set Master Password'
                  : 'Password Protection Settings'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close password dialog"
            className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
            {mode === 'unlock'
              ? 'Enter your master password or PIN to view and edit locked notes.'
              : 'Your master password is salted and hashed with SHA-256 before syncing. Keep it memorable—it cannot be recovered if forgotten.'}
          </p>

          {(mode === 'unlock' || (mode === 'manage' && lockHash)) && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                {mode === 'unlock' ? 'Master Password / PIN' : 'Current Password'}
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  autoFocus
                  required
                  placeholder="Enter password..."
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2 pr-9 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode !== 'unlock' && (
            <>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                  {mode === 'manage' ? 'New Password (optional if updating timer)' : 'Master Password / PIN'}
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoFocus={mode === 'setup'}
                  required={mode === 'setup'}
                  placeholder="At least 4 characters"
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                  Confirm Password
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required={mode === 'setup' || newPw.length > 0}
                  placeholder="Re-enter password"
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                  Auto-Lock Vault Timeout
                </label>
                <select
                  value={timeoutMin}
                  onChange={(e) => setTimeoutMin(Number(e.target.value))}
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none"
                >
                  <option value={5}>After 5 minutes</option>
                  <option value={15}>After 15 minutes</option>
                  <option value={30}>After 30 minutes</option>
                  <option value={60}>After 1 hour</option>
                  <option value={0}>Manual lock only</option>
                </select>
              </div>
            </>
          )}

          {error && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="pt-2 flex items-center justify-between gap-2">
            {mode === 'manage' && lockHash ? (
              <button
                type="button"
                disabled={busy}
                onClick={handleRemoveLock}
                className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
              >
                Remove Password
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {mode === 'unlock' ? 'Unlock' : 'Save Password'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
