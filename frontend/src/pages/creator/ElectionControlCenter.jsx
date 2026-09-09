import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { electionsApi } from '../../api/elections';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import { 
  Vote, 
  ArrowLeft, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Lock, 
  Users, 
  UserCheck, 
  ShieldCheck, 
  Settings as SettingsIcon, 
  Activity, 
  FileText, 
  Terminal, 
  Calendar, 
  Clock, 
  Building2, 
  Upload, 
  Plus, 
  Trash2, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  AlertTriangle,
  Mail,
  Camera,
  Check,
  X,
  Eye,
  Shield,
  BarChart3
} from 'lucide-react';

export default function ElectionControlCenter() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [voters, setVoters] = useState([]);
  const [voterCount, setVoterCount] = useState(0);
  const [verificationConfig, setVerificationConfig] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

  // Voters search & filter state
  const [voterSearch, setVoterSearch] = useState('');
  const [voterFilter, setVoterFilter] = useState('ALL');

  // Candidate add modal state
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ full_name: '', party_or_affiliation: '', bio: '', photo: null });

  // Voter CSV upload state
  const [showUploadCsv, setShowUploadCsv] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const fetchElectionData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [elData, cands, votersData, vConfig, logs] = await Promise.all([
        electionsApi.getElection(id),
        electionsApi.getCandidates(id).catch(() => []),
        electionsApi.getEligibleVoters(id).catch(() => ({ count: 0, results: [] })),
        electionsApi.getVerificationConfig(id).catch(() => null),
        electionsApi.getAuditLogs ? electionsApi.getAuditLogs(id).catch(() => []) : Promise.resolve([])
      ]);

      setElection(elData);
      setCandidates(Array.isArray(cands) ? cands : []);
      setVoters(Array.isArray(votersData?.results) ? votersData.results : []);
      setVoterCount(votersData?.count ?? (Array.isArray(votersData?.results) ? votersData.results.length : 0));
      setVerificationConfig(vConfig);
      setAuditLogs(Array.isArray(logs?.results) ? logs.results : Array.isArray(logs) ? logs : []);
    } catch (err) {
      console.error('Failed to load election workspace:', err);
      setError(err.message || 'Could not load election control workspace.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchElectionData();
  }, [fetchElectionData]);

  // Lifecycle action controls
  const handleLifecycleAction = async (actionType) => {
    setIsActionLoading(true);
    setActionMessage('');
    setError(null);
    try {
      if (actionType === 'start') {
        await electionsApi.startElection(id);
        setActionMessage('Election has started and is now LIVE.');
      } else if (actionType === 'pause') {
        await electionsApi.pauseElection(id);
        setActionMessage('Election has been PAUSED.');
      } else if (actionType === 'resume') {
        await electionsApi.resumeElection(id);
        setActionMessage('Election has RESUMED and is active.');
      } else if (actionType === 'complete') {
        await electionsApi.completeElection(id);
        setActionMessage('Election has been marked COMPLETED.');
      } else if (actionType === 'configure') {
        await electionsApi.markElectionConfigured(id);
        setActionMessage('Election configured and ready to be scheduled.');
      }
      await fetchElectionData();
    } catch (err) {
      console.error(`Action ${actionType} failed:`, err);
      setError(err.response?.data?.error || err.message || `Action ${actionType} failed.`);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Add Candidate handler
  const handleCreateCandidate = async (e) => {
    e.preventDefault();
    if (!newCandidate.full_name.trim()) return;

    setIsActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('full_name', newCandidate.full_name);
      if (newCandidate.party_or_affiliation) formData.append('party_or_affiliation', newCandidate.party_or_affiliation);
      if (newCandidate.bio) formData.append('bio', newCandidate.bio);
      if (newCandidate.photo) formData.append('photo', newCandidate.photo);

      await electionsApi.createCandidate(id, formData);
      setShowAddCandidate(false);
      setNewCandidate({ full_name: '', party_or_affiliation: '', bio: '', photo: null });
      await fetchElectionData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add candidate.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Remove Candidate handler
  const handleDeleteCandidate = async (candidateId) => {
    if (!window.confirm('Are you sure you want to remove this candidate?')) return;
    try {
      await electionsApi.deleteCandidate(id, candidateId);
      await fetchElectionData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove candidate.');
    }
  };

  // CSV file selection & dry run preview
  const handleCsvSelect = async (file) => {
    setUploadFile(file);
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dry_run', 'true');
      const preview = await electionsApi.bulkUploadVoters(id, formData);
      setUploadPreview(preview);
    } catch (err) {
      setError(err.response?.data?.error || 'CSV validation failed.');
      setUploadPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  // CSV commit import
  const handleCommitCsv = async () => {
    if (!uploadFile) return;
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('dry_run', 'false');
      await electionsApi.bulkUploadVoters(id, formData);
      setShowUploadCsv(false);
      setUploadFile(null);
      setUploadPreview(null);
      await fetchElectionData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to commit CSV voter import.');
    } finally {
      setIsUploading(false);
    }
  };

  // Delete voter handler
  const handleDeleteVoter = async (voterId) => {
    if (!window.confirm('Remove this voter from the eligible roster?')) return;
    try {
      await electionsApi.deleteEligibleVoter(id, voterId);
      await fetchElectionData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove voter.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <LoadingSkeleton variant="header" />
        <LoadingSkeleton variant="cards" count={6} />
      </div>
    );
  }

  if (error && !election) {
    return (
      <div className="py-12">
        <ErrorState 
          title="Election Control Center Unavailable"
          message={error}
          onRetry={fetchElectionData}
        />
      </div>
    );
  }

  const status = (election?.status || 'draft').toLowerCase();
  const isLocked = election?.is_locked || ['active', 'live', 'paused', 'completed', 'cancelled'].includes(status);
  const isOwner = election?.created_by === user?.id || election?.created_by_email === user?.email;

  const formatDate = (iso) => {
    if (!iso) return 'Not configured';
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  // Masking helpers for voter privacy
  const maskEmail = (email) => {
    if (!email) return '—';
    const [name, domain] = email.split('@');
    if (!domain) return email;
    const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}*`;
    return `${maskedName}@${domain}`;
  };

  const maskMobile = (mobile) => {
    if (!mobile) return '—';
    return mobile.length > 4 ? `******${mobile.slice(-4)}` : mobile;
  };

  // Filtered voters list
  const filteredVoters = voters.filter((v) => {
    const q = voterSearch.toLowerCase();
    const matchesQ = (v.name || '').toLowerCase().includes(q) || 
                     (v.email || '').toLowerCase().includes(q) || 
                     (v.student_id || '').toLowerCase().includes(q);
    const matchesFilter = 
      voterFilter === 'ALL' ||
      (voterFilter === 'VOTED' && v.has_voted) ||
      (voterFilter === 'PENDING' && !v.has_voted) ||
      (voterFilter === 'VERIFIED' && v.verification_status === 'VERIFIED');
    return matchesQ && matchesFilter;
  });

  const votedCount = voters.filter(v => v.has_voted).length;
  const verifiedCount = voters.filter(v => ['VERIFIED', 'OTP_VERIFIED', 'FACE_VERIFIED'].includes(v.verification_status)).length;
  const participationRate = voterCount > 0 ? ((votedCount / voterCount) * 100).toFixed(1) : 0;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'candidates', label: `Candidates (${candidates.length})`, icon: Users },
    { id: 'voters', label: `Eligible Voters (${voterCount})`, icon: UserCheck },
    { id: 'verification', label: 'Verification Rules', icon: ShieldCheck },
    { id: 'monitoring', label: 'Live Monitoring', icon: Activity },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
    { id: 'audit', label: 'Audit Trail', icon: Terminal },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Breadcrumb */}
      <div className="space-y-2">
        <Link
          to="/elections"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to My Elections</span>
        </Link>

        {/* Master Control Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge status={election.status} />
              {election.organization && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/40">
                  <Building2 className="w-3 h-3" />
                  <span>{election.organization}</span>
                </span>
              )}
              {isLocked && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  <Lock className="w-3 h-3" />
                  <span>Configuration Locked</span>
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {election.title || election.name}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <span>Created by:</span>
                <span className={isOwner ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300 font-medium'}>
                  {isOwner ? 'You (Election Owner)' : election.created_by_email || 'Organizer'}
                </span>
                <span>•</span>
                <span>Created {new Date(election.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Status-Permitted Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={fetchElectionData}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title="Refresh status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Actions for DRAFT */}
            {status === 'draft' && (
              <button
                onClick={() => handleLifecycleAction('configure')}
                disabled={isActionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Mark Configured</span>
              </button>
            )}

            {/* Actions for SCHEDULED / CONFIGURED */}
            {['configured', 'scheduled'].includes(status) && (
              <button
                onClick={() => handleLifecycleAction('start')}
                disabled={isActionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all"
              >
                <Play className="w-4 h-4" />
                <span>Launch Election Now</span>
              </button>
            )}

            {/* Actions for ACTIVE (LIVE) */}
            {['active', 'live'].includes(status) && (
              <>
                <button
                  onClick={() => handleLifecycleAction('pause')}
                  disabled={isActionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/25 transition-all"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause Voting</span>
                </button>
                <button
                  onClick={() => handleLifecycleAction('complete')}
                  disabled={isActionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-md transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Conclude Election</span>
                </button>
              </>
            )}

            {/* Actions for PAUSED */}
            {status === 'paused' && (
              <>
                <button
                  onClick={() => handleLifecycleAction('resume')}
                  disabled={isActionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all"
                >
                  <Play className="w-4 h-4" />
                  <span>Resume Voting</span>
                </button>
                <button
                  onClick={() => handleLifecycleAction('complete')}
                  disabled={isActionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-md transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Conclude Election</span>
                </button>
              </>
            )}

            {/* COMPLETED or CANCELLED */}
            {['completed', 'cancelled'].includes(status) && (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
                Election Lifecycle Concluded
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Workspace Tab Bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-0.5 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================
          TAB 1: OVERVIEW
          ========================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Eligible Voters</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{voterCount}</div>
              <span className="text-[10px] text-slate-400">Restricted to roster</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-indigo-600 uppercase">Verified Voters</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{verifiedCount}</div>
              <span className="text-[10px] text-slate-400">{voterCount > 0 ? ((verifiedCount / voterCount) * 100).toFixed(0) : 0}% of roster</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-emerald-600 uppercase">Votes Cast</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{votedCount}</div>
              <span className="text-[10px] text-slate-400">{participationRate}% participation</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Candidates</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{candidates.length}</div>
              <span className="text-[10px] text-slate-400">On official ballot</span>
            </div>
          </div>

          {/* Schedule & Rules Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Election Schedule & Lifecycle Parameters</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 block mb-1">Voting Commences:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{formatDate(election.start_datetime)}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 block mb-1">Voting Concludes:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{formatDate(election.end_datetime)}</span>
              </div>
            </div>

            {election.description && (
              <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/30 p-3.5 rounded-xl">
                <span className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Description:</span>
                {election.description}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: CANDIDATES
          ========================================================= */}
      {activeTab === 'candidates' && (
        <div className="space-y-6">
          {/* Lock Banner if active */}
          {isLocked && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs">
              <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Candidate configuration is locked because the election has started or concluded. Modifications are permanently disabled.</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Official Candidate Slate ({candidates.length})
            </h3>
            {!isLocked && (
              <button
                onClick={() => setShowAddCandidate(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-sm hover:bg-indigo-700 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Candidate</span>
              </button>
            )}
          </div>

          {candidates.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-400" />
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">No candidates registered</div>
              <div className="text-[11px] text-slate-500">Register candidates before launching this election.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {candidates.map((cand) => (
                <div
                  key={cand.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative group"
                >
                  {!isLocked && (
                    <button
                      onClick={() => handleDeleteCandidate(cand.id)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Remove candidate"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className="flex items-center gap-3">
                    {cand.photo_url || cand.photo ? (
                      <img
                        src={cand.photo_url || cand.photo}
                        alt={cand.full_name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center justify-center">
                        {cand.full_name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{cand.full_name}</h4>
                      {cand.party_or_affiliation && (
                        <span className="text-[11px] text-slate-500 truncate block">{cand.party_or_affiliation}</span>
                      )}
                    </div>
                  </div>

                  {cand.bio && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                      {cand.bio}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Candidate Modal */}
          {showAddCandidate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <form onSubmit={handleCreateCandidate} className="max-w-md w-full p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add Candidate</h3>
                  <button type="button" onClick={() => setShowAddCandidate(false)}><X className="w-4 h-4 text-slate-400" /></button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newCandidate.full_name}
                      onChange={(e) => setNewCandidate({ ...newCandidate, full_name: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Affiliation / Party</label>
                    <input
                      type="text"
                      value={newCandidate.party_or_affiliation}
                      onChange={(e) => setNewCandidate({ ...newCandidate, party_or_affiliation: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewCandidate({ ...newCandidate, photo: e.target.files?.[0] })}
                      className="w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Manifesto</label>
                    <textarea
                      rows={3}
                      value={newCandidate.bio}
                      onChange={(e) => setNewCandidate({ ...newCandidate, bio: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowAddCandidate(false)} className="px-4 py-2 text-xs font-semibold">Cancel</button>
                  <button type="submit" disabled={isActionLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm">
                    {isActionLoading ? 'Saving...' : 'Add Candidate'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 3: ELIGIBLE VOTERS
          ========================================================= */}
      {activeTab === 'voters' && (
        <div className="space-y-6">
          {/* Lock Banner if active */}
          {isLocked && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs">
              <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Eligible voter configuration is locked because the election has started. Voter roster modifications are permanently disabled.</span>
            </div>
          )}

          {/* Roster Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={voterSearch}
                  onChange={(e) => setVoterSearch(e.target.value)}
                  placeholder="Search voter roster..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800"
                />
              </div>
              <select
                value={voterFilter}
                onChange={(e) => setVoterFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800"
              >
                <option value="ALL">All Roster</option>
                <option value="VOTED">Voted</option>
                <option value="PENDING">Pending Vote</option>
                <option value="VERIFIED">Verified</option>
              </select>
            </div>

            {!isLocked && (
              <button
                onClick={() => setShowUploadCsv(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-sm hover:bg-indigo-700 transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload CSV Roster</span>
              </button>
            )}
          </div>

          {/* Voter Roster Table */}
          <div className="rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 font-semibold">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Masked Email</th>
                    <th className="p-3">Student ID</th>
                    <th className="p-3">Masked Mobile</th>
                    <th className="p-3">Verification</th>
                    <th className="p-3">Voted Status</th>
                    {!isLocked && <th className="p-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredVoters.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                        No voters found in roster matching your query.
                      </td>
                    </tr>
                  ) : (
                    filteredVoters.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                          {v.name || '—'}
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                          {maskEmail(v.email)}
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                          {v.student_id || '—'}
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                          {maskMobile(v.mobile_number)}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            v.verification_status === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {v.verification_status}
                          </span>
                        </td>
                        <td className="p-3">
                          {v.has_voted ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center gap-1 w-fit">
                              <Check className="w-3 h-3" />
                              <span>Voted</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">Pending</span>
                          )}
                        </td>
                        {!isLocked && (
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteVoter(v.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                              title="Remove voter"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upload CSV Modal */}
          {showUploadCsv && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="max-w-md w-full p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Upload Eligible Voter List (CSV)</h3>
                  <button onClick={() => { setShowUploadCsv(false); setUploadPreview(null); setUploadFile(null); }}>
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                {!uploadPreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-center cursor-pointer space-y-2"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCsvSelect(file);
                      }}
                    />
                    <Upload className="w-6 h-6 mx-auto text-indigo-600" />
                    <span className="text-xs font-bold block">{uploadFile ? uploadFile.name : 'Select CSV file'}</span>
                    <span className="text-[10px] text-slate-400">Accepted: name,email,mobile_number,student_id</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                        <div className="font-black text-sm">{uploadPreview.valid_count}</div>
                        <span className="text-[10px]">Valid</span>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                        <div className="font-black text-sm">{uploadPreview.duplicate_count}</div>
                        <span className="text-[10px]">Duplicates</span>
                      </div>
                      <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300">
                        <div className="font-black text-sm">{uploadPreview.invalid_count}</div>
                        <span className="text-[10px]">Invalid</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowUploadCsv(false); setUploadPreview(null); setUploadFile(null); }}
                    className="px-4 py-2 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  {uploadPreview && (
                    <button
                      type="button"
                      onClick={handleCommitCsv}
                      disabled={uploadPreview.valid_count === 0 || isUploading}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                      {isUploading ? 'Importing...' : `Import ${uploadPreview.valid_count} Voters`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 4: VERIFICATION RULES
          ========================================================= */}
      {activeTab === 'verification' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Election-Specific Voter Verification Protocols</span>
            </h3>
            <p className="text-xs text-slate-500">
              Only voters satisfying these protocols will receive a one-time single-use voting authorization token to cast their ballot.
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-indigo-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Email OTP Challenge</div>
                    <div className="text-[11px] text-slate-500">Sends a 6-digit one-time passcode to voter's registered roster email.</div>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  verificationConfig?.require_email_otp
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                }`}>
                  {verificationConfig?.require_email_otp ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Camera className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Webcam Face Recognition</div>
                    <div className="text-[11px] text-slate-500">Validates physical presence and matches facial embeddings (OpenCV SFace).</div>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  verificationConfig?.require_webcam_verification
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                }`}>
                  {verificationConfig?.require_webcam_verification ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 5: MONITORING
          ========================================================= */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Participation Rate</span>
              <div className="text-3xl font-black text-slate-900 dark:text-white">{participationRate}%</div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${Math.min(100, participationRate)}%` }} />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Ballots Cast</span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{votedCount}</div>
              <span className="text-[11px] text-slate-400">Out of {voterCount} eligible voters</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Verification Rate</span>
              <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {voterCount > 0 ? ((verifiedCount / voterCount) * 100).toFixed(1) : 0}%
              </div>
              <span className="text-[11px] text-slate-400">{verifiedCount} voters verified</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 6: SETTINGS
          ========================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Election Configuration Metadata</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Title:</span>
                <span className="font-bold text-slate-900 dark:text-white">{election.title}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Organization:</span>
                <span className="font-bold text-slate-900 dark:text-white">{election.organization || 'None'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Category:</span>
                <span className="font-bold text-slate-900 dark:text-white">{election.position_category || 'General'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Type:</span>
                <span className="font-bold text-slate-900 dark:text-white capitalize">{election.election_type}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 7: AUDIT
          ========================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-600" />
              <span>Immutable Election Audit Trail</span>
            </h3>

            {auditLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No operational audit entries recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 dark:text-white capitalize font-mono text-[11px]">{log.action}</span>
                      <div className="text-[11px] text-slate-500">By {log.actor_email || 'System'}</div>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
