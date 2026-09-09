import { useState } from 'react';
import { Laptop, Smartphone, Monitor, Globe, LogOut, CheckCircle2, Shield, AlertTriangle, Loader2 } from 'lucide-react';

export default function SessionCard({ session, onRevoke }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const getDeviceIcon = (deviceLabel) => {
    const label = (deviceLabel || '').toLowerCase();
    if (label.includes('ios') || label.includes('android') || label.includes('iphone') || label.includes('ipad')) {
      return <Smartphone className="w-5 h-5 text-indigo-600" />;
    }
    if (label.includes('mac') || label.includes('windows') || label.includes('linux')) {
      return <Laptop className="w-5 h-5 text-[#0d2847]" />;
    }
    return <Monitor className="w-5 h-5 text-slate-700" />;
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Recently';
    const now = new Date();
    const past = new Date(timestamp);
    const diffSecs = Math.floor((now - past) / 1000);

    if (diffSecs < 60) return 'Active just now';
    if (diffSecs < 3600) return `Active ${Math.floor(diffSecs / 60)} minutes ago`;
    if (diffSecs < 86400) return `Active ${Math.floor(diffSecs / 3600)} hours ago`;
    return `Active ${Math.floor(diffSecs / 86400)} days ago`;
  };

  const handleRevokeClick = async () => {
    setIsRevoking(true);
    try {
      await onRevoke(session.id);
    } finally {
      setIsRevoking(false);
      setShowConfirm(false);
    }
  };

  return (
    <div
      className={`p-4 sm:p-5 rounded-lg border transition-all ${
        session.is_current
          ? 'bg-blue-50/40 border-blue-300 ring-1 ring-blue-300 shadow-xs'
          : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
            {getDeviceIcon(session.device_label)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-slate-900">{session.device_label}</h4>
              {session.is_current && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded uppercase">
                  <CheckCircle2 className="w-3 h-3" />
                  This Device
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-slate-400" />
                IP: {session.masked_ip}
              </span>
              <span>&bull;</span>
              <span>{formatRelativeTime(session.last_active_at)}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div>
          {session.is_current ? (
            <span className="text-[11px] font-semibold text-slate-400 italic">
              Current Active Session
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Revoke Access</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal / Drawer */}
      {showConfirm && (
        <div className="mt-3 p-3 bg-red-50/80 border border-red-200 rounded text-xs space-y-2">
          <div className="flex items-start gap-2 text-red-900">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>
              Log out <strong>{session.device_label}</strong>? This will immediately invalidate access on that device.
            </span>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              disabled={isRevoking}
              className="px-3 py-1 text-slate-600 hover:text-slate-900 font-semibold text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRevokeClick}
              disabled={isRevoking}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded transition-colors flex items-center gap-1"
            >
              {isRevoking ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              <span>Confirm Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
