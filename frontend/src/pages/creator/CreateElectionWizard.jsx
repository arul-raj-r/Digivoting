import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { electionsApi } from '../../api/elections';
import { 
  FileText, 
  Calendar, 
  Users, 
  Upload, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Building2, 
  Clock, 
  Mail, 
  Camera, 
  Check, 
  X, 
  FileCheck,
  AlertTriangle,
  Download,
  Copy,
  ExternalLink,
  QrCode
} from 'lucide-react';

export default function CreateElectionWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdElectionId, setCreatedElectionId] = useState(null);
  const [error, setError] = useState(null);

  // Success Publication Modal
  const [publishedModalData, setPublishedModalData] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // STEP 1: Basic Information
  const [basicInfo, setBasicInfo] = useState({
    title: '',
    description: '',
    election_type: 'organizational',
    organization: '',
    position_category: '',
  });

  // STEP 2: Schedule
  const [schedule, setSchedule] = useState({
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
  });

  // STEP 3: Candidates
  const [candidates, setCandidates] = useState([]);
  const [newCandidate, setNewCandidate] = useState({
    full_name: '',
    party_or_affiliation: '',
    bio: '',
    photo: null,
    photoPreview: null
  });
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);

  // STEP 4: Voter CSV Upload
  const [voterFile, setVoterFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState(null);
  const [isValidatingCsv, setIsValidatingCsv] = useState(false);
  const [csvImported, setCsvImported] = useState(false);
  const [importedVoterCount, setImportedVoterCount] = useState(0);
  const fileInputRef = useRef(null);

  // STEP 5: Verification Settings
  const [verificationConfig, setVerificationConfig] = useState({
    require_email_otp: true,
    require_webcam_verification: false,
  });

  // Steps definition
  const steps = [
    { num: 1, label: 'Basic Info', icon: FileText },
    { num: 2, label: 'Schedule', icon: Calendar },
    { num: 3, label: 'Candidates', icon: Users },
    { num: 4, label: 'Voter List', icon: Upload },
    { num: 5, label: 'Verification', icon: ShieldCheck },
    { num: 6, label: 'Review & Publish', icon: CheckCircle2 },
  ];

  // Helper: compute schedule duration
  const getDurationString = () => {
    if (!schedule.startDate || !schedule.startTime || !schedule.endDate || !schedule.endTime) {
      return null;
    }
    const start = new Date(`${schedule.startDate}T${schedule.startTime}`);
    const end = new Date(`${schedule.endDate}T${schedule.endTime}`);
    const diffMs = end - start;
    if (diffMs <= 0) return 'Invalid duration (End must be after Start)';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffHours / 24);
    const hours = diffHours % 24;
    return `${days > 0 ? `${days} day(s) ` : ''}${hours} hour(s)`;
  };

  // Step 1 validation
  const validateStep1 = () => {
    if (!basicInfo.title.trim()) {
      setError('Election title is required.');
      return false;
    }
    setError(null);
    return true;
  };

  // Step 2 validation
  const validateStep2 = () => {
    if (!schedule.startDate || !schedule.startTime || !schedule.endDate || !schedule.endTime) {
      setError('Please provide complete start and end dates and times.');
      return false;
    }
    const start = new Date(`${schedule.startDate}T${schedule.startTime}`);
    const end = new Date(`${schedule.endDate}T${schedule.endTime}`);
    if (end <= start) {
      setError('End date and time must be later than the start date and time.');
      return false;
    }
    if (start <= new Date()) {
      setError('Election start date and time must be scheduled in the future.');
      return false;
    }
    setError(null);
    return true;
  };

  // Helper to extract clean user-facing error messages from DRF validation responses
  const extractErrorMessage = (err, defaultMsg = 'Failed to complete election setup.') => {
    if (!err) return defaultMsg;
    const data = err.response?.data;
    if (!data) return err.message || defaultMsg;
    if (typeof data === 'string') return data;
    if (data.error && typeof data.error === 'string') return data.error;
    if (data.detail && typeof data.detail === 'string') return data.detail;
    if (data.message && typeof data.message === 'string') return data.message;

    // Handle Django REST Framework field validation errors: { field: ["Error text"] }
    if (typeof data === 'object') {
      const messages = [];
      for (const [field, errors] of Object.entries(data)) {
        if (Array.isArray(errors)) {
          messages.push(errors.join(' '));
        } else if (typeof errors === 'string') {
          messages.push(errors);
        }
      }
      if (messages.length > 0) {
        return messages.join(' ');
      }
    }

    return err.message || defaultMsg;
  };

  // Step 3 candidate handlers
  const handleAddCandidate = () => {
    if (!newCandidate.full_name.trim()) {
      setError('Candidate name is required.');
      return;
    }
    setCandidates([...candidates, { ...newCandidate, id: Date.now() }]);
    setNewCandidate({
      full_name: '',
      party_or_affiliation: '',
      bio: '',
      photo: null,
      photoPreview: null
    });
    setShowAddCandidateModal(false);
    setError(null);
  };

  const handleRemoveCandidate = (id) => {
    setCandidates(candidates.filter(c => c.id !== id));
  };

  const handleCandidatePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewCandidate({
        ...newCandidate,
        photo: file,
        photoPreview: URL.createObjectURL(file)
      });
    }
  };

  // Step 4 CSV handlers
  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      handleCsvSelected(file);
    } else {
      setError('Please upload a valid .csv file.');
    }
  };

  const handleCsvSelected = async (file) => {
    setVoterFile(file);
    setError(null);
    setIsValidatingCsv(true);

    try {
      let electionId = createdElectionId;
      if (!electionId) {
        const draftElection = await electionsApi.createElection({
          title: basicInfo.title || 'Untitled Draft Election',
          description: basicInfo.description,
          organization: basicInfo.organization,
          position_category: basicInfo.position_category,
          election_type: basicInfo.election_type,
        });
        electionId = draftElection.id;
        setCreatedElectionId(electionId);
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('dry_run', 'true');

      const result = await electionsApi.bulkUploadVoters(electionId, formData);
      setCsvPreview(result);
    } catch (err) {
      console.error('CSV validation failed:', err);
      setError(extractErrorMessage(err, 'Failed to validate CSV file.'));
      setCsvPreview(null);
    } finally {
      setIsValidatingCsv(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!voterFile || !createdElectionId) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', voterFile);
      formData.append('dry_run', 'false');

      const result = await electionsApi.bulkUploadVoters(createdElectionId, formData);
      setCsvImported(true);
      setImportedVoterCount(result.success_count || result.imported_count || 0);
    } catch (err) {
      console.error('Import failed:', err);
      setError(extractErrorMessage(err, 'Failed to import valid voters.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigation handlers
  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    setError(null);
    setCurrentStep((prev) => Math.min(6, prev + 1));
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // Final Publish or Save Draft
  const handleFinalSubmit = async (publishNow = false) => {
    setIsSubmitting(true);
    setError(null);

    try {
      let electionId = createdElectionId;

      // 1. Upfront pre-flight checks for Publish
      if (publishNow) {
        if (!basicInfo.title.trim()) {
          setError('Election title is required.');
          setIsSubmitting(false);
          return;
        }
        if (!schedule.startDate || !schedule.startTime || !schedule.endDate || !schedule.endTime) {
          setError('Please configure a valid voting schedule (start and end date & time) before publishing.');
          setIsSubmitting(false);
          return;
        }
        const start = new Date(`${schedule.startDate}T${schedule.startTime}`);
        const end = new Date(`${schedule.endDate}T${schedule.endTime}`);
        if (end <= start) {
          setError('End date and time must be later than the start date and time.');
          setIsSubmitting(false);
          return;
        }
        if (start <= new Date()) {
          setError('Election start date and time must be scheduled in the future.');
          setIsSubmitting(false);
          return;
        }
        if (candidates.length === 0) {
          setError('Cannot publish election: Please register at least one candidate first.');
          setIsSubmitting(false);
          return;
        }
        if (!csvImported && !voterFile && importedVoterCount === 0) {
          setError('Cannot publish election: Please upload and confirm an eligible voter roster (CSV) first.');
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Create or update election basic details while in draft status
      if (!electionId) {
        const created = await electionsApi.createElection({
          title: basicInfo.title,
          description: basicInfo.description,
          organization: basicInfo.organization,
          position_category: basicInfo.position_category,
          election_type: basicInfo.election_type,
        });
        electionId = created.id;
        setCreatedElectionId(electionId);
      } else {
        await electionsApi.updateElection(electionId, {
          title: basicInfo.title,
          description: basicInfo.description,
          organization: basicInfo.organization,
          position_category: basicInfo.position_category,
          election_type: basicInfo.election_type,
        });
      }

      // 3. Save Schedule dates to draft election WITHOUT setting status: 'scheduled' prematurely
      let startIso = null;
      let endIso = null;
      if (schedule.startDate && schedule.startTime && schedule.endDate && schedule.endTime) {
        startIso = new Date(`${schedule.startDate}T${schedule.startTime}`).toISOString();
        endIso = new Date(`${schedule.endDate}T${schedule.endTime}`).toISOString();
        await electionsApi.updateElection(electionId, {
          start_datetime: startIso,
          end_datetime: endIso,
        });
      }

      // 4. Ensure Voter Roster is imported if file was uploaded but not confirmed yet
      if (!csvImported && voterFile) {
        const formData = new FormData();
        formData.append('file', voterFile);
        formData.append('dry_run', 'false');
        const result = await electionsApi.bulkUploadVoters(electionId, formData);
        setCsvImported(true);
        setImportedVoterCount(result.success_count || result.imported_count || 0);
      }

      // 5. Save Candidates (check existing candidates to prevent duplicates)
      const existingCandidates = await electionsApi.getCandidates(electionId).catch(() => []);
      const existingCandidateNames = new Set(
        (Array.isArray(existingCandidates) ? existingCandidates : []).map(c => c.full_name?.toLowerCase().trim())
      );

      for (const cand of candidates) {
        if (existingCandidateNames.has(cand.full_name?.toLowerCase().trim())) {
          continue;
        }
        const candData = new FormData();
        candData.append('full_name', cand.full_name);
        if (cand.party_or_affiliation) candData.append('party_or_affiliation', cand.party_or_affiliation);
        if (cand.bio) candData.append('bio', cand.bio);
        if (cand.photo) candData.append('photo', cand.photo);
        await electionsApi.createCandidate(electionId, candData);
      }

      // 6. Save Verification Settings (must occur while configuration is unlocked)
      await electionsApi.updateVerificationConfig(electionId, {
        require_email_otp: verificationConfig.require_email_otp,
        require_webcam_verification: verificationConfig.require_webcam_verification,
      });

      // 7. If publishNow requested, perform state machine transitions:
      // Gate 1: 'draft' -> 'configured' (verifies candidates > 0 and eligible voters > 0)
      // Gate 2: 'configured' -> 'scheduled' (verifies valid future start and end datetimes)
      if (publishNow) {
        try {
          await electionsApi.markElectionConfigured(electionId);
        } catch (confErr) {
          const msg = extractErrorMessage(confErr);
          if (!msg.toLowerCase().includes('already configured')) {
            throw confErr;
          }
        }

        if (startIso && endIso) {
          await electionsApi.updateElection(electionId, { status: 'scheduled' });
        }

        const cleanEntryUrl = `${window.location.origin}/election/${electionId}`;
        try {
          const qrDataUrl = await QRCode.toDataURL(cleanEntryUrl, {
            width: 280,
            margin: 2,
            color: {
              dark: '#101216',
              light: '#ffffff'
            }
          });
          setPublishedModalData({
            id: electionId,
            title: basicInfo.title,
            url: cleanEntryUrl,
            qrDataUrl
          });
          return;
        } catch (qrErr) {
          console.error('QR generation fallback:', qrErr);
        }
      }

      // If draft or QR modal skipped, navigate to workspace
      navigate(`/elections/${electionId}`);
    } catch (err) {
      console.error('Final submit failed:', err);
      setError(extractErrorMessage(err, 'Failed to complete election setup. Please check that all steps are configured.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!publishedModalData?.url) return;
    navigator.clipboard.writeText(publishedModalData.url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!publishedModalData?.qrDataUrl) return;
    const a = document.createElement('a');
    a.href = publishedModalData.qrDataUrl;
    a.download = `election-${publishedModalData.id.slice(0, 8)}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 font-sans">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link
            to="/elections"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to elections</span>
          </Link>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Create New Election
          </h1>
        </div>
      </div>

      {/* Progress Steps Header */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[580px]">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;

            return (
              <React.Fragment key={s.num}>
                <button
                  onClick={() => {
                    if (isCompleted) setCurrentStep(s.num);
                  }}
                  disabled={!isCompleted && !isCurrent}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                    isCurrent
                      ? 'bg-[#1a4231] text-white font-semibold'
                      : isCompleted
                      ? 'text-emerald-800 dark:text-emerald-400 font-semibold hover:bg-stone-50 dark:hover:bg-[#101216]'
                      : 'text-stone-400 dark:text-stone-600 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs ${
                    isCurrent ? 'bg-white/20 text-white' : isCompleted ? 'bg-emerald-100 dark:bg-[#1a4231] text-emerald-700 dark:text-emerald-300' : 'bg-stone-100 dark:bg-[#101216] text-stone-400'
                  }`}>
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <span className="text-xs">{s.label}</span>
                </button>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-stone-200 dark:border-[#262a33]'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 text-rose-800 dark:text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step Contents Card */}
      <div className="p-6 sm:p-8 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] shadow-xs">
        
        {/* STEP 1: BASIC INFORMATION */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="border-b border-stone-100 dark:border-[#262a33] pb-4">
              <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
                Step 1: Basic Election Details
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Define the institutional context, title, and voting domain for this election.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Election Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={basicInfo.title}
                  onChange={(e) => setBasicInfo({ ...basicInfo, title: e.target.value })}
                  placeholder="e.g. Student Council General Elections 2026"
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg bg-white dark:bg-[#101216] border border-stone-300 dark:border-[#262a33] text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                    Organization / Institution
                  </label>
                  <input
                    type="text"
                    value={basicInfo.organization}
                    onChange={(e) => setBasicInfo({ ...basicInfo, organization: e.target.value })}
                    placeholder="e.g. Faculty of Engineering / Tech Club"
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg bg-white dark:bg-[#101216] border border-stone-300 dark:border-[#262a33] text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                    Election Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={basicInfo.election_type}
                    onChange={(e) => setBasicInfo({ ...basicInfo, election_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg bg-white dark:bg-[#101216] border border-stone-300 dark:border-[#262a33] text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                  >
                    <option value="organizational">Organizational</option>
                    <option value="academic">Academic / Student Council</option>
                    <option value="club">Club / Society</option>
                    <option value="workplace">Workplace / Committee</option>
                    <option value="general">General Election</option>
                    <option value="poll">Internal Poll</option>
                    <option value="referendum">Referendum</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Position / Category (Optional)
                </label>
                <input
                  type="text"
                  value={basicInfo.position_category}
                  onChange={(e) => setBasicInfo({ ...basicInfo, position_category: e.target.value })}
                  placeholder="e.g. President, Department Representative, Executive Board"
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg bg-white dark:bg-[#101216] border border-stone-300 dark:border-[#262a33] text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Description / Instructions
                </label>
                <textarea
                  rows={4}
                  value={basicInfo.description}
                  onChange={(e) => setBasicInfo({ ...basicInfo, description: e.target.value })}
                  placeholder="Provide background information, voter instructions, or guidelines for this election..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg bg-white dark:bg-[#101216] border border-stone-300 dark:border-[#262a33] text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: SCHEDULE */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-b border-stone-100 dark:border-[#262a33] pb-4">
              <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
                Step 2: Voting Window Schedule
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Set the active window for ballot submission. Voting booth opens and closes strictly according to these timestamps.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Start Window */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-[#262a33] space-y-3 bg-stone-50 dark:bg-[#101216]">
                <div className="flex items-center gap-2 font-semibold text-xs text-stone-800 dark:text-stone-200">
                  <Clock className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span>Voting Opens</span>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={schedule.startDate}
                    onChange={(e) => setSchedule({ ...schedule, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#171a20] border border-stone-300 dark:border-[#262a33] text-stone-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={schedule.startTime}
                    onChange={(e) => setSchedule({ ...schedule, startTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#171a20] border border-stone-300 dark:border-[#262a33] text-stone-900 dark:text-white"
                  />
                </div>
              </div>

              {/* End Window */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-[#262a33] space-y-3 bg-stone-50 dark:bg-[#101216]">
                <div className="flex items-center gap-2 font-semibold text-xs text-stone-800 dark:text-stone-200">
                  <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <span>Voting Closes</span>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={schedule.endDate}
                    onChange={(e) => setSchedule({ ...schedule, endDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#171a20] border border-stone-300 dark:border-[#262a33] text-stone-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">End Time *</label>
                  <input
                    type="time"
                    value={schedule.endTime}
                    onChange={(e) => setSchedule({ ...schedule, endTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#171a20] border border-stone-300 dark:border-[#262a33] text-stone-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {getDurationString() && (
              <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-[#1a4231]/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Computed voting window duration: <strong>{getDurationString()}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: CANDIDATES */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-[#262a33] pb-4">
              <div>
                <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
                  Step 3: Candidates Slate
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Register the candidates or options contesting in this election.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCandidateModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1a4231] hover:bg-[#1f4f3b] text-white text-xs font-semibold transition-colors self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add candidate</span>
              </button>
            </div>

            {candidates.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-stone-300 dark:border-[#262a33] space-y-3">
                <Users className="w-8 h-8 text-stone-400 mx-auto" />
                <p className="text-xs text-stone-500">No candidates added to this ballot yet.</p>
                <button
                  type="button"
                  onClick={() => setShowAddCandidateModal(true)}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-[#262a33] text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[#101216]"
                >
                  Add candidate now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {candidates.map((cand) => (
                  <div
                    key={cand.id}
                    className="p-4 rounded-xl border border-stone-200 dark:border-[#262a33] bg-stone-50/50 dark:bg-[#101216] space-y-3 relative group"
                  >
                    <button
                      onClick={() => handleRemoveCandidate(cand.id)}
                      className="absolute top-3 right-3 p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Remove candidate"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-3">
                      {cand.photoPreview ? (
                        <img
                          src={cand.photoPreview}
                          alt={cand.full_name}
                          className="w-12 h-12 rounded-lg object-cover border border-stone-200 dark:border-stone-700"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-[#1a4231]/20 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center justify-center">
                          {cand.full_name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-stone-900 dark:text-white truncate">{cand.full_name}</h4>
                        {cand.party_or_affiliation && (
                          <span className="text-[11px] text-stone-500 truncate block">{cand.party_or_affiliation}</span>
                        )}
                      </div>
                    </div>

                    {cand.bio && (
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-2">
                        {cand.bio}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Modal: Add Candidate */}
            {showAddCandidateModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
                <div className="max-w-md w-full p-6 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-stone-100 dark:border-[#262a33] pb-3">
                    <h3 className="font-serif text-sm font-bold text-stone-900 dark:text-white">Add Candidate</h3>
                    <button onClick={() => setShowAddCandidateModal(false)} className="text-stone-400 hover:text-stone-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">Candidate full name *</label>
                      <input
                        type="text"
                        value={newCandidate.full_name}
                        onChange={(e) => setNewCandidate({ ...newCandidate, full_name: e.target.value })}
                        placeholder="e.g. Dr. Jane Smith"
                        className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#101216] border border-stone-300 dark:border-[#262a33] text-stone-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">Affiliation / Organization</label>
                      <input
                        type="text"
                        value={newCandidate.party_or_affiliation}
                        onChange={(e) => setNewCandidate({ ...newCandidate, party_or_affiliation: e.target.value })}
                        placeholder="e.g. Department of Computer Science"
                        className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#101216] border border-stone-300 dark:border-[#262a33] text-stone-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">Candidate photo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCandidatePhotoChange}
                        className="w-full text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-stone-100 dark:file:bg-[#101216] file:text-stone-800 dark:file:text-stone-200"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">Manifesto / Summary</label>
                      <textarea
                        rows={3}
                        value={newCandidate.bio}
                        onChange={(e) => setNewCandidate({ ...newCandidate, bio: e.target.value })}
                        placeholder="Brief summary of candidate platform or credentials..."
                        className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#101216] border border-stone-300 dark:border-[#262a33] text-stone-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-[#262a33]">
                    <button
                      type="button"
                      onClick={() => setShowAddCandidateModal(false)}
                      className="px-3.5 py-1.5 rounded-lg border border-stone-300 dark:border-[#262a33] text-xs font-semibold text-stone-700 dark:text-stone-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCandidate}
                      className="px-4 py-1.5 rounded-lg bg-[#1a4231] text-white text-xs font-semibold hover:bg-[#1f4f3b]"
                    >
                      Save candidate
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: VOTER LIST UPLOAD */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b border-stone-100 dark:border-[#262a33] pb-4">
              <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
                Step 4: Upload Eligible Voter Roster (CSV)
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Upload authorized voters for this election. Required CSV schema: <code className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">student_id, full_name, email, mobile</code>.
              </p>
            </div>

            {/* Template Download Link */}
            <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-[#101216] border border-stone-200 dark:border-[#262a33] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs text-stone-600 dark:text-stone-400">
                <span>Need the official template? Use the pre-formatted 4-column CSV:</span>
              </div>
              <a
                href="/sample_voters_template.csv"
                download="sample_voters_template.csv"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#171a20] border border-stone-300 dark:border-[#262a33] text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-stone-50 dark:hover:bg-[#101216] transition-colors shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample CSV</span>
              </a>
            </div>

            {/* Drag & Drop Area */}
            {!csvImported && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className="p-8 rounded-xl border-2 border-dashed border-stone-300 dark:border-[#262a33] hover:border-emerald-600 bg-stone-50/50 dark:bg-[#101216]/50 text-center cursor-pointer transition-all space-y-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCsvSelected(file);
                  }}
                />
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-[#1a4231]/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800/60">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-stone-900 dark:text-white block">
                    {voterFile ? voterFile.name : 'Click to select or drag and drop voter roster CSV'}
                  </span>
                  <p className="text-[11px] text-stone-500">
                    Required columns: <code className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold">student_id, full_name, email, mobile</code>
                  </p>
                </div>
              </div>
            )}

            {/* Loading Validation indicator */}
            {isValidatingCsv && (
              <div className="p-6 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <span className="text-xs text-stone-500">Validating CSV rows against database constraints...</span>
              </div>
            )}

            {/* CSV Validation Results Breakdown */}
            {csvPreview && !csvImported && !isValidatingCsv && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-[#1a4231]/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-lg font-bold text-emerald-900 dark:text-emerald-200">{csvPreview.valid_count}</div>
                      <div className="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">Valid records</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" />
                    <div>
                      <div className="text-lg font-bold text-amber-900 dark:text-amber-200">{csvPreview.duplicate_count}</div>
                      <div className="text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-400">Duplicates</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-700 dark:text-rose-400 shrink-0" />
                    <div>
                      <div className="text-lg font-bold text-rose-900 dark:text-rose-200">{csvPreview.invalid_count}</div>
                      <div className="text-[10px] font-semibold uppercase text-rose-700 dark:text-rose-400">Invalid records</div>
                    </div>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="border border-stone-200 dark:border-[#262a33] rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 bg-stone-50 dark:bg-[#101216] border-b border-stone-200 dark:border-[#262a33] flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                      Roster Preview ({csvPreview.total_rows_processed} detected rows)
                    </span>
                    <span className="text-[11px] text-stone-500 font-mono">
                      {voterFile?.name}
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-stone-100 dark:bg-[#101216] text-stone-600 dark:text-stone-400 text-[11px]">
                        <tr>
                          <th className="p-2.5">Student ID</th>
                          <th className="p-2.5">Full Name</th>
                          <th className="p-2.5">Email</th>
                          <th className="p-2.5">Mobile</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-[#262a33]">
                        {csvPreview.valid_records.slice(0, 15).map((v, i) => (
                          <tr key={`valid-${i}`} className="hover:bg-stone-50/50 dark:hover:bg-[#101216]">
                            <td className="p-2.5 font-mono text-stone-600 dark:text-stone-400">{v.student_id || '—'}</td>
                            <td className="p-2.5 font-medium text-stone-800 dark:text-stone-200">{v.full_name || v.name || '—'}</td>
                            <td className="p-2.5 font-mono text-stone-600 dark:text-stone-400">{v.email}</td>
                            <td className="p-2.5 font-mono text-stone-600 dark:text-stone-400">{v.mobile || '—'}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                VALID
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => { setVoterFile(null); setCsvPreview(null); }}
                    className="px-4 py-2 rounded-lg border border-stone-300 dark:border-[#262a33] text-xs font-semibold text-stone-700 dark:text-stone-300"
                  >
                    Select different file
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={csvPreview.valid_count === 0 || isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1a4231] hover:bg-[#1f4f3b] text-white text-xs font-semibold disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm & Import {csvPreview.valid_count} Voters</span>
                  </button>
                </div>
              </div>
            )}

            {/* Post-Import Success Screen */}
            {csvImported && (
              <div className="p-6 rounded-xl bg-emerald-50/60 dark:bg-[#1a4231]/30 border border-emerald-200 dark:border-emerald-800/50 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    Voter Roster Imported Successfully
                  </h3>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    {importedVoterCount} authorized voter records have been stored in this election's isolated roster.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setCsvImported(false); setVoterFile(null); setCsvPreview(null); }}
                  className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                >
                  Upload additional / replacement list
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: VERIFICATION SETTINGS */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b border-stone-100 dark:border-[#262a33] pb-4">
              <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
                Step 5: Identity Verification Protocols
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Configure the voter challenge safeguards required before a ballot can be marked and submitted.
              </p>
            </div>

            <div className="space-y-4">
              {/* Email OTP Toggle */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-[#262a33] flex items-start justify-between gap-4 bg-stone-50/50 dark:bg-[#101216]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-stone-900 dark:text-white">
                    <Mail className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span>Email OTP Challenge</span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Dispatches a 6-digit cryptographic challenge code to the voter's roster email address prior to ballot access.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verificationConfig.require_email_otp}
                    onChange={(e) => setVerificationConfig({ ...verificationConfig, require_email_otp: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a4231]" />
                </label>
              </div>

              {/* Webcam Face Verification Toggle */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-[#262a33] flex items-start justify-between gap-4 bg-stone-50/50 dark:bg-[#101216]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-stone-900 dark:text-white">
                    <Camera className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span>Webcam Presence Verification</span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Captures a live voter presence frame for institutional audit logs prior to ballot access.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verificationConfig.require_webcam_verification}
                    onChange={(e) => setVerificationConfig({ ...verificationConfig, require_webcam_verification: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a4231]" />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: REVIEW & PUBLISH */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="border-b border-stone-100 dark:border-[#262a33] pb-4">
              <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
                Step 6: Review & Finalize
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Inspect your election parameters. An official voting QR code and direct link will be produced upon publication.
              </p>
            </div>

            <div className="space-y-4">
              {/* Details Review */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-[#262a33] space-y-2">
                <span className="text-xs font-bold text-stone-900 dark:text-white">Election Details</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-stone-500">Title:</span>
                    <div className="font-semibold text-stone-900 dark:text-white">{basicInfo.title}</div>
                  </div>
                  <div>
                    <span className="text-stone-500">Organization:</span>
                    <div className="font-semibold text-stone-900 dark:text-white">{basicInfo.organization || 'None specified'}</div>
                  </div>
                  <div>
                    <span className="text-stone-500">Type:</span>
                    <div className="font-semibold text-stone-900 dark:text-white capitalize">{basicInfo.election_type}</div>
                  </div>
                  <div>
                    <span className="text-stone-500">Category:</span>
                    <div className="font-semibold text-stone-900 dark:text-white">{basicInfo.position_category || 'General'}</div>
                  </div>
                </div>
              </div>

              {/* Candidates Review */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-[#262a33] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 dark:text-white">Candidates Slate</span>
                  <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-bold">{candidates.length} Registered</span>
                </div>
                {candidates.length === 0 ? (
                  <div className="text-xs text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>No candidates added yet. You can still save as draft and add candidates later.</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {candidates.map((c, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg text-xs bg-stone-100 dark:bg-[#101216] font-medium text-stone-800 dark:text-stone-200">
                        {c.full_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Voter Roll Review */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-[#262a33] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 dark:text-white">Eligible Voter Roster</span>
                  <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                    {csvImported ? `${importedVoterCount} Voters Uploaded` : 'Not uploaded yet'}
                  </span>
                </div>
                {!csvImported && (
                  <div className="text-xs text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>No voter list uploaded yet. Eligible voters can also be uploaded from the workspace after saving.</span>
                  </div>
                )}
              </div>

              {/* Verification Review */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-[#262a33] space-y-2">
                <span className="text-xs font-bold text-stone-900 dark:text-white">Identity Verification Safeguards</span>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    {verificationConfig.require_email_otp ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-stone-400" />}
                    <span>Email OTP</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {verificationConfig.require_webcam_verification ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-stone-400" />}
                    <span>Webcam Presence Audit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-stone-100 dark:border-[#262a33] mt-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-300 dark:border-[#262a33] text-xs font-semibold text-stone-700 dark:text-stone-300 disabled:opacity-40"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-3">
            {currentStep === 6 ? (
              <>
                <button
                  type="button"
                  onClick={() => handleFinalSubmit(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-lg border border-stone-300 dark:border-[#262a33] text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[#101216] transition-colors"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleFinalSubmit(true)}
                  disabled={isSubmitting || !basicInfo.title}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#1a4231] hover:bg-[#1f4f3b] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Publishing...' : 'Publish Election & Generate QR'}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#101216] hover:bg-[#171a20] dark:bg-[#1a4231] dark:hover:bg-[#1f4f3b] text-white text-xs font-semibold transition-colors"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* PUBLICATION SUCCESS & QR CODE MODAL */}
      {publishedModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] space-y-6 shadow-2xl text-center">
            
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-[#1a4231]/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800/60">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold">
                Election Published
              </span>
              <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-white">
                {publishedModalData.title}
              </h3>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                Your election is ready. Voters can scan this QR code or use the direct link to access the ballot.
              </p>
            </div>

            {/* Rendered QR Code using 'qrcode' package */}
            <div className="p-4 rounded-xl bg-white border border-stone-200 inline-block mx-auto shadow-xs">
              <img
                src={publishedModalData.qrDataUrl}
                alt="Election Access QR Code"
                className="w-48 h-48 mx-auto"
              />
              <p className="text-[10px] font-mono text-stone-500 mt-2">
                /election/{publishedModalData.id.slice(0, 8)}...
              </p>
            </div>

            {/* Direct Link Copy */}
            <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-[#101216] border border-stone-200 dark:border-[#262a33] flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-stone-600 dark:text-stone-300 truncate">
                {publishedModalData.url}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1 rounded bg-white dark:bg-[#171a20] border border-stone-300 dark:border-[#262a33] text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 flex items-center gap-1 shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleDownloadQr}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-stone-300 dark:border-[#262a33] text-stone-800 dark:text-stone-200 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-[#101216]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download QR code</span>
              </button>

              <button
                type="button"
                onClick={() => navigate(`/elections/${publishedModalData.id}`)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#1a4231] hover:bg-[#1f4f3b] text-white text-xs font-semibold"
              >
                <span>Control Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
