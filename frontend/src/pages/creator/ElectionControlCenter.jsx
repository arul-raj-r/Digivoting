import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { electionsApi } from '../../api/elections';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import Modal from '../../components/common/Modal';
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
  BarChart3,
  ArrowRight,
  Award,
  CheckCircle2,
  Info,
  HelpCircle,
  KeyRound,
  QrCode,
  Download,
  Copy
} from 'lucide-react';
import QRCode from 'qrcode';

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

  // Voter status for this election
  const [voterStatus, setVoterStatus] = useState({
    isEligible: false,
    hasVoted: false,
    verificationStatus: null,
  });

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

  // QR Code and Share State
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (election?.id) {
      const entryUrl = `${window.location.origin}/election/${election.id}`;
      QRCode.toDataURL(entryUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#101216', light: '#ffffff' }
      })
        .then(setQrCodeDataUrl)
        .catch(console.error);
    }
  }, [election?.id]);

  // Manifesto modal for candidate view
  const [selectedManifestoCandidate, setSelectedManifestoCandidate] = useState(null);

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'warning',
  });

  const closeConfirmModal = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
  };

  const fetchElectionData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Parallel fetch election metadata, candidates, verification rules
      const [elData, cands, vConfig, voterOverview] = await Promise.all([
        electionsApi.getElection(id),
        electionsApi.getCandidates(id).catch(() => []),
        electionsApi.getVerificationConfig(id).catch(() => null),
        electionsApi.getVoterOverview().catch(() => [])
      ]);

      setElection(elData);
      setCandidates(Array.isArray(cands) ? cands : []);
      setVerificationConfig(vConfig);

      // Verify if current creator/user is on the eligible voter roster
      const overviewList = Array.isArray(voterOverview) ? voterOverview : (voterOverview?.results || voterOverview?.elections || []);
      const matched = overviewList.find((e) => String(e.id) === String(id));
      setVoterStatus({
        isEligible: Boolean(elData?.is_eligible ?? matched?.is_eligible),
        hasVoted: Boolean(elData?.already_voted ?? (matched?.already_voted || matched?.has_voted)),
        verificationStatus: elData?.verification_status || matched?.verification_status || null,
      });

      // Check if user is creator or staff before fetching administrative voter lists
      const isOwnerCheck = Boolean(
        user && (
          elData.created_by === user.id ||
          elData.created_by_email === user.email ||
          user.is_staff ||
          user.role === 'ADMIN'
        )
      );

      if (isOwnerCheck) {
        const [votersData, logs] = await Promise.all([
          electionsApi.getEligibleVoters(id).catch(() => ({ count: 0, results: [] })),
          electionsApi.getAuditLogs ? electionsApi.getAuditLogs(id).catch(() => []) : Promise.resolve([])
        ]);
        setVoters(Array.isArray(votersData?.results) ? votersData.results : []);
        setVoterCount(votersData?.count ?? (Array.isArray(votersData?.results) ? votersData.results.length : 0));
        setAuditLogs(Array.isArray(logs?.results) ? logs.results : Array.isArray(logs) ? logs : []);
      }
    } catch (err) {
      console.error('Failed to load election workspace:', err);
      setError(err.message || 'Could not load election details.');
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchElectionData();
  }, [fetchElectionData]);

  // Lifecycle action controls with confirmation
  const executeLifecycleAction = async (actionType) => {
    closeConfirmModal();
    setIsActionLoading(true);
    setActionMessage('');
    setError(null);
    try {
      if (actionType === 'start') {
        await electionsApi.startElection(id);
        setActionMessage('Election has successfully started and is now LIVE.');
      } else if (actionType === 'pause') {
        await electionsApi.pauseElection(id);
        setActionMessage('Election voting has been PAUSED.');
      } else if (actionType === 'resume') {
        await electionsApi.resumeElection(id);
        setActionMessage('Election has RESUMED and voting is active.');
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

  const promptLifecycleAction = (actionType) => {
    const titles = {
      start: 'Launch Election Now',
      pause: 'Pause Election Voting',
      resume: 'Resume Election Voting',
      complete: 'Conclude Election',
      configure: 'Mark Election Configured',
    };

    const messages = {
      start: 'Are you sure you want to launch this election? Once started, voting will begin, eligible voters will be able to cast ballots, and the candidate slate and voter roster will be permanently locked.',
      pause: 'Are you sure you want to pause voting? Voters will temporarily not be able to cast ballots until resumed.',
      resume: 'Are you sure you want to resume voting? Eligible voters will once again be able to verify and cast ballots.',
      complete: 'Are you sure you want to conclude this election? Once concluded, no further votes can be submitted and certified results will be finalized.',
      configure: 'Mark this election as configured? This verifies candidates and voters are present before scheduling.',
    };

    setConfirmModal({
      isOpen: true,
      title: titles[actionType] || 'Confirm Action',
      message: messages[actionType] || 'Do you wish to proceed with this operation?',
      confirmText: actionType === 'start' ? 'Launch Election' : actionType === 'complete' ? 'Conclude' : 'Proceed',
      type: actionType === 'complete' || actionType === 'pause' ? 'warning' : 'info',
      onConfirm: () => executeLifecycleAction(actionType),
    });
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

  // Remove Candidate handler with modal
  const promptDeleteCandidate = (candidateId, candidateName) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Candidate',
      message: `Are you sure you want to remove "${candidateName}" from the official ballot slate? This action cannot be undone.`,
      confirmText: 'Remove Candidate',
      type: 'danger',
      onConfirm: async () => {
        closeConfirmModal();
        setIsActionLoading(true);
        try {
          await electionsApi.deleteCandidate(id, candidateId);
          await fetchElectionData();
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to remove candidate.');
        } finally {
          setIsActionLoading(false);
        }
      },
    });
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

  // Delete voter handler with modal
  const promptDeleteVoter = (voterId, voterIdentifier) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Eligible Voter',
      message: `Are you sure you want to remove ${voterIdentifier} from the official voter roster? They will no longer be eligible to cast a ballot.`,
      confirmText: 'Remove Voter',
      type: 'danger',
      onConfirm: async () => {
        closeConfirmModal();
        try {
          await electionsApi.deleteEligibleVoter(id, voterId);
          await fetchElectionData();
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to remove voter.');
        }
      },
    });
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
          title="Election Unavailable"
          message={error}
          onRetry={fetchElectionData}
        />
      </div>
    );
  }

  const status = (election?.status || 'draft').toLowerCase();
  const isLocked = election?.is_locked || ['active', 'live', 'paused', 'completed', 'cancelled'].includes(status);
  const isOwner = Boolean(
    user && (
      election?.created_by === user.id ||
      election?.created_by_email === user.email ||
      user.is_staff ||
      user.role === 'ADMIN'
    )
  );

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

  // Filtered voters list for creator
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

  // =========================================================================
  // VIEW A: VOTER-FACING ELECTION DETAILS VIEW (Phase 12)
  // Displayed when the viewing user is NOT the creator/admin
  // =========================================================================
  if (!isOwner) {
    const isLive = ['active', 'live'].includes(status);
    const isScheduled = ['scheduled', 'configured'].includes(status);
    const isCompleted = status === 'completed';
    const isPaused = status === 'paused';

    return (
      <div className="space-y-8 pb-20 max-w-5xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            to="/available-elections"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Available Elections</span>
          </Link>
        </div>

        {/* Master Header Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge status={election.status} />
              {election.organization && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/40">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{election.organization}</span>
                </span>
              )}
              {election.position_category && (
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {election.position_category}
                </span>
              )}
            </div>

            <Link
              to={`/help?election_id=${election.id}&election_title=${encodeURIComponent(election.title)}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              <span>Election Guidance</span>
            </Link>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {election.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              {election.description || 'No detailed instructions have been provided by the election organizer.'}
            </p>
          </div>
        </div>

        {/* Voter Participation Status Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              YOUR VOTER STATUS
            </span>
            <div className="flex items-center gap-2">
              {voterStatus.hasVoted ? (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Ballot Cast & Recorded</span>
                </div>
              ) : voterStatus.isEligible ? (
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                  <UserCheck className="w-5 h-5 text-emerald-500" />
                  <span>Authorized Voter on Official Roster</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-500 font-semibold text-sm">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Not on Voter Roster</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 max-w-xl">
              {voterStatus.hasVoted
                ? 'Thank you for participating. Your vote choice has been decoupled and sealed.'
                : voterStatus.isEligible && isLive
                ? 'Voting is active right now. Verify your credentials and submit your ballot.'
                : voterStatus.isEligible && isScheduled
                ? `This election is scheduled to commence on ${formatDate(election.start_datetime)}. You can complete identity verification in advance.`
                : voterStatus.isEligible && isCompleted
                ? 'This election has ended. Official results and tallies are available to view.'
                : voterStatus.isEligible && isPaused
                ? 'Voting has been temporarily paused by election organizers.'
                : 'Your email address is not registered on the eligible voter roster for this contest. Only designated members can cast ballots.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {voterStatus.isEligible && !voterStatus.hasVoted && isLive && (
              <button
                type="button"
                onClick={() => navigate(`/elections/${election.id}/participate`)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all"
              >
                <Vote className="w-4 h-4" />
                <span>Vote in Polling Booth</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {voterStatus.isEligible && !voterStatus.hasVoted && isScheduled && (
              <button
                type="button"
                onClick={() => navigate(`/elections/${election.id}/participate`)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Verify Identity</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {isCompleted && (
              <Link
                to={`/results?electionId=${election.id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                <Award className="w-4 h-4" />
                <span>View Results & Reports</span>
              </Link>
            )}
          </div>
        </div>

        {/* Schedule & Rules Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Voting Schedule</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500">Commences:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{formatDate(election.start_datetime)}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500">Concludes:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{formatDate(election.end_datetime)}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500">Contest Type:</span>
                <span className="font-bold text-slate-900 dark:text-white capitalize">{election.election_type || 'Standard'}</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verification & Security Protocols</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">Email OTP Authentication</span>
                    <span className="text-[11px] text-slate-500">6-digit passcode sent to your registered email</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  verificationConfig?.require_email_otp !== false
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                }`}>
                  {verificationConfig?.require_email_otp !== false ? 'REQUIRED' : 'OPTIONAL'}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">Webcam Liveness Check</span>
                    <span className="text-[11px] text-slate-500">Facial matching to prevent impersonation</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  verificationConfig?.require_webcam_verification
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                }`}>
                  {verificationConfig?.require_webcam_verification ? 'REQUIRED' : 'NOT REQUIRED'}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">Voting Token Security</span>
                    <span className="text-[11px] text-slate-500">Single-use 15-minute validity window</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                  ENFORCED
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Official Candidate Slate (Equal Visual Treatment, Neutrality Enforced) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Official Candidates Slate ({candidates.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                All candidates are presented with equal visibility. DigiVote enforces strict neutrality without endorsements or rankings.
              </p>
            </div>
          </div>

          {candidates.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-400" />
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">No candidates registered yet</div>
              <div className="text-[11px] text-slate-500">Candidate slate is currently being assembled by the election organizer.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {candidates.map((cand) => (
                <div
                  key={cand.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-indigo-500/30 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {cand.photo_url || cand.photo ? (
                        <img
                          src={cand.photo_url || cand.photo}
                          alt={cand.full_name}
                          className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-lg flex items-center justify-center shrink-0 border border-indigo-200/40">
                          {cand.full_name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {cand.full_name}
                        </h4>
                        {cand.party_or_affiliation && (
                          <span className="text-xs text-slate-500 truncate block mt-0.5 font-medium">
                            {cand.party_or_affiliation}
                          </span>
                        )}
                      </div>
                    </div>

                    {cand.bio && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                        {cand.bio}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedManifestoCandidate(cand)}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Read Statement</span>
                    </button>

                    <span className="text-[10px] text-slate-400 font-mono">
                      Candidate
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Candidate Manifesto Modal */}
        {selectedManifestoCandidate && (
          <Modal
            isOpen={Boolean(selectedManifestoCandidate)}
            onClose={() => setSelectedManifestoCandidate(null)}
            title={`Candidate Statement: ${selectedManifestoCandidate.full_name}`}
            size="md"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                {selectedManifestoCandidate.photo_url || selectedManifestoCandidate.photo ? (
                  <img
                    src={selectedManifestoCandidate.photo_url || selectedManifestoCandidate.photo}
                    alt={selectedManifestoCandidate.full_name}
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xl flex items-center justify-center">
                    {selectedManifestoCandidate.full_name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedManifestoCandidate.full_name}
                  </h3>
                  {selectedManifestoCandidate.party_or_affiliation && (
                    <p className="text-xs text-slate-500 font-medium">
                      {selectedManifestoCandidate.party_or_affiliation}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  PLATFORM & BIO STATEMENT
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedManifestoCandidate.bio || 'No expanded manifesto statement submitted by candidate.'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedManifestoCandidate(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW B: CREATOR ELECTION MANAGEMENT WORKSPACE (Phase 22)
  // Displayed when the viewing user IS the election creator or administrator
  // =========================================================================
  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'candidates', label: `Candidates (${candidates.length})`, icon: Users },
    { id: 'voters', label: `Eligible Voters (${voterCount})`, icon: UserCheck },
    { id: 'verification', label: 'Verification Rules', icon: ShieldCheck },
    { id: 'monitoring', label: 'Live Monitoring', icon: Activity },
    { id: 'share', label: 'QR & Election Link', icon: QrCode },
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
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
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
                onClick={() => promptLifecycleAction('configure')}
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
                onClick={() => promptLifecycleAction('start')}
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
                  onClick={() => promptLifecycleAction('pause')}
                  disabled={isActionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/25 transition-all"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause Voting</span>
                </button>
                <button
                  onClick={() => promptLifecycleAction('complete')}
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
                  onClick={() => promptLifecycleAction('resume')}
                  disabled={isActionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all"
                >
                  <Play className="w-4 h-4" />
                  <span>Resume Voting</span>
                </button>
                <button
                  onClick={() => promptLifecycleAction('complete')}
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
                      onClick={() => promptDeleteCandidate(cand.id, cand.full_name)}
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
                    <label className="block text-[11px] font-semibold mb-1">Manifesto / Platform</label>
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
                              onClick={() => promptDeleteVoter(v.id, v.name || v.email)}
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
          TAB: QR & ELECTION LINK
          ========================================================= */}
      {activeTab === 'share' && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] space-y-6">
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <span>Official Election Link & Printable QR Code</span>
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Distribute this official QR code or link to your authorized voters. Any voter scanning this code will arrive directly at the ballot entry page.
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8 p-6 rounded-xl bg-stone-50 dark:bg-[#101216] border border-stone-200 dark:border-[#262a33]">
              {/* QR Image */}
              <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-xs shrink-0 text-center">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt={`QR Code for ${election.title}`}
                    className="w-56 h-56 mx-auto"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-xs text-stone-400">
                    Generating QR code...
                  </div>
                )}
                <span className="text-[10px] font-mono text-stone-500 block mt-2">
                  Standard camera phone scanner compatible
                </span>
              </div>

              {/* Share Controls & Guidance */}
              <div className="space-y-4 flex-1 w-full">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Official Public Ballot URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/election/${election.id}`}
                      className="w-full px-3.5 py-2 text-xs font-mono rounded-lg bg-white dark:bg-[#171a20] border border-stone-300 dark:border-[#262a33] text-stone-800 dark:text-stone-200 focus:outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/election/${election.id}`);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white dark:bg-[#171a20] hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-300 dark:border-[#262a33] text-xs font-semibold text-stone-800 dark:text-stone-200 transition-colors shrink-0"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!qrCodeDataUrl) return;
                      const a = document.createElement('a');
                      a.href = qrCodeDataUrl;
                      a.download = `election-${election.id.slice(0, 8)}-qr.png`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1a4231] hover:bg-[#1f4f3b] text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download QR Code (PNG)</span>
                  </button>

                  <Link
                    to={`/election/${election.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-stone-300 dark:border-[#262a33] text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#101216] text-xs font-semibold transition-colors"
                  >
                    <span>Preview Voter Entry View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="p-3.5 rounded-lg bg-emerald-50/60 dark:bg-[#1a4231]/30 border border-emerald-200 dark:border-emerald-800/50 text-[11px] text-emerald-900 dark:text-emerald-200 space-y-1">
                  <p className="font-semibold">Voter Access Protocol:</p>
                  <p className="leading-relaxed">
                    Voters must authenticate with an institutional email registered on the official voter roster. Unlisted accounts will be prevented from accessing the ballot.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 7: SETTINGS
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

      {/* Global Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type}
        isLoading={isActionLoading}
      />
    </div>
  );
}
