import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Layers, 
  Clock, 
  Mail, 
  Camera, 
  Check, 
  X, 
  FileCheck,
  AlertTriangle,
  Sparkles,
  HelpCircle,
  Vote
} from 'lucide-react';

export default function CreateElectionWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdElectionId, setCreatedElectionId] = useState(null);
  const [error, setError] = useState(null);

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
    require_webcam_verification: true,
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
    setError(null);
    return true;
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
      // First ensure election exists as draft if not created yet
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

      // Run dry-run validation against backend
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dry_run', 'true');

      const result = await electionsApi.bulkUploadVoters(electionId, formData);
      setCsvPreview(result);
    } catch (err) {
      console.error('CSV validation failed:', err);
      setError(err.response?.data?.error || err.message || 'Failed to validate CSV file.');
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
      setError(err.response?.data?.error || err.message || 'Failed to import valid voters.');
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

      // 1. Create election if not yet created
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
        // Update details
        await electionsApi.updateElection(electionId, {
          title: basicInfo.title,
          description: basicInfo.description,
          organization: basicInfo.organization,
          position_category: basicInfo.position_category,
          election_type: basicInfo.election_type,
        });
      }

      // 2. Save Schedule if provided
      if (schedule.startDate && schedule.startTime && schedule.endDate && schedule.endTime) {
        const startIso = new Date(`${schedule.startDate}T${schedule.startTime}`).toISOString();
        const endIso = new Date(`${schedule.endDate}T${schedule.endTime}`).toISOString();
        await electionsApi.scheduleElection(electionId, {
          start_datetime: startIso,
          end_datetime: endIso,
        });
      }

      // 3. Save Candidates
      for (const cand of candidates) {
        const candData = new FormData();
        candData.append('full_name', cand.full_name);
        if (cand.party_or_affiliation) candData.append('party_or_affiliation', cand.party_or_affiliation);
        if (cand.bio) candData.append('bio', cand.bio);
        if (cand.photo) candData.append('photo', cand.photo);
        await electionsApi.createCandidate(electionId, candData);
      }

      // 4. Save Verification Settings
      await electionsApi.updateVerificationConfig(electionId, {
        require_email_otp: verificationConfig.require_email_otp,
        require_webcam_verification: verificationConfig.require_webcam_verification,
      });

      // 5. If publishNow requested, attempt transition to scheduled/active
      if (publishNow) {
        try {
          await electionsApi.markElectionConfigured(electionId);
        } catch {
          // Continue to workspace
        }
      }

      // Navigate to the newly created election's unified control workspace
      navigate(`/elections/${electionId}`);
    } catch (err) {
      console.error('Final submit failed:', err);
      setError(err.response?.data?.error || err.response?.data?.status || err.message || 'Failed to complete election setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link
            to="/elections"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to My Elections</span>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Create New Election</span>
          </h1>
        </div>
      </div>

      {/* Progress Steps Header */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
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
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all ${
                    isCurrent
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25'
                      : isCompleted
                      ? 'text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800'
                      : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                    isCurrent ? 'bg-white/20 text-white' : isCompleted ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <span className="text-xs">{s.label}</span>
                </button>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-3 text-rose-700 dark:text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step Contents */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm">
        
        {/* =========================================================
            STEP 1: BASIC INFORMATION
            ========================================================= */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Step 1: Basic Election Details
              </h2>
              <p className="text-xs text-slate-500">
                Define the institutional context, title, and voting domain for this election.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Election Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={basicInfo.title}
                  onChange={(e) => setBasicInfo({ ...basicInfo, title: e.target.value })}
                  placeholder="e.g. Student Council General Elections 2026"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Organization / Institution
                  </label>
                  <input
                    type="text"
                    value={basicInfo.organization}
                    onChange={(e) => setBasicInfo({ ...basicInfo, organization: e.target.value })}
                    placeholder="e.g. Faculty of Engineering / Tech Club"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Election Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={basicInfo.election_type}
                    onChange={(e) => setBasicInfo({ ...basicInfo, election_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Position / Category (Optional)
                </label>
                <input
                  type="text"
                  value={basicInfo.position_category}
                  onChange={(e) => setBasicInfo({ ...basicInfo, position_category: e.target.value })}
                  placeholder="e.g. President, Department Representative, Executive Board"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Description / Purpose
                </label>
                <textarea
                  rows={4}
                  value={basicInfo.description}
                  onChange={(e) => setBasicInfo({ ...basicInfo, description: e.target.value })}
                  placeholder="Provide background information, voter instructions, or guidelines for this election..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            STEP 2: SCHEDULE
            ========================================================= */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Step 2: Election Schedule
              </h2>
              <p className="text-xs text-slate-500">
                Specify when voting begins and ends. Configuration is locked once voting commences.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Start Date & Time */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Voting Opens (Start)</span>
                </span>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={schedule.startDate}
                      onChange={(e) => setSchedule({ ...schedule, startDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={schedule.startTime}
                      onChange={(e) => setSchedule({ ...schedule, startTime: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* End Date & Time */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Voting Closes (End)</span>
                </span>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">End Date</label>
                    <input
                      type="date"
                      value={schedule.endDate}
                      onChange={(e) => setSchedule({ ...schedule, endDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">End Time</label>
                    <input
                      type="time"
                      value={schedule.endTime}
                      onChange={(e) => setSchedule({ ...schedule, endTime: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Duration Display */}
            {getDurationString() && (
              <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-300">Total Voting Duration:</span>
                <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">{getDurationString()}</span>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            STEP 3: CANDIDATES
            ========================================================= */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Step 3: Candidate Configuration
                </h2>
                <p className="text-xs text-slate-500">
                  Register the candidates appearing on the official ballot.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCandidateModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-sm hover:bg-indigo-700 transition-all self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Candidate</span>
              </button>
            </div>

            {/* Candidates Preview Cards */}
            {candidates.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                <Users className="w-8 h-8 mx-auto text-slate-400" />
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">No candidates added yet</div>
                  <div className="text-[11px] text-slate-500">Click "Add Candidate" to register candidate profiles and manifestos.</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {candidates.map((cand) => (
                  <div
                    key={cand.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3 relative group"
                  >
                    <button
                      onClick={() => handleRemoveCandidate(cand.id)}
                      className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Remove candidate"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-3">
                      {cand.photoPreview ? (
                        <img
                          src={cand.photoPreview}
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

            {/* Modal: Add Candidate */}
            {showAddCandidateModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <div className="max-w-md w-full p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add Candidate</h3>
                    <button onClick={() => setShowAddCandidateModal(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={newCandidate.full_name}
                        onChange={(e) => setNewCandidate({ ...newCandidate, full_name: e.target.value })}
                        placeholder="e.g. John Doe"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Affiliation / Party (Optional)</label>
                      <input
                        type="text"
                        value={newCandidate.party_or_affiliation}
                        onChange={(e) => setNewCandidate({ ...newCandidate, party_or_affiliation: e.target.value })}
                        placeholder="e.g. Progressive Student Union"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Photo (Optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCandidatePhotoChange}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Manifesto / Bio</label>
                      <textarea
                        rows={3}
                        value={newCandidate.bio}
                        onChange={(e) => setNewCandidate({ ...newCandidate, bio: e.target.value })}
                        placeholder="Brief summary of candidate's platform and goals..."
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddCandidateModal(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCandidate}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-sm hover:bg-indigo-700"
                    >
                      Save Candidate
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            STEP 4: VOTER LIST UPLOAD (CRITICAL FEATURE)
            ========================================================= */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Step 4: Upload Eligible Voter List (CSV)
              </h2>
              <p className="text-xs text-slate-500">
                Only voters in your uploaded roster can participate in this election. General DigiVote registration alone does not grant voting rights.
              </p>
            </div>

            {/* Drag & Drop Area */}
            {!csvImported && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className="p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500/60 dark:hover:border-indigo-500/60 bg-slate-50/50 dark:bg-slate-900/30 text-center cursor-pointer transition-all space-y-3"
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
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-200/40">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {voterFile ? voterFile.name : 'Click to browse or drag & drop CSV file'}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Supported columns: <code className="text-indigo-600 dark:text-indigo-400 font-mono">name,email,mobile_number,student_id</code>
                  </p>
                </div>
              </div>
            )}

            {/* Loading Validation indicator */}
            {isValidatingCsv && (
              <div className="p-6 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <span className="text-xs text-slate-500">Validating CSV rows against database rules...</span>
              </div>
            )}

            {/* CSV Validation Results Breakdown */}
            {csvPreview && !csvImported && !isValidatingCsv && (
              <div className="space-y-4">
                {/* Metrics Breakdown Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="text-lg font-black text-emerald-700 dark:text-emerald-400">{csvPreview.valid_count}</div>
                      <div className="text-[10px] font-semibold uppercase text-emerald-600">Valid Records</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <div>
                      <div className="text-lg font-black text-amber-700 dark:text-amber-400">{csvPreview.duplicate_count}</div>
                      <div className="text-[10px] font-semibold uppercase text-amber-600">Duplicates Detected</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                    <div>
                      <div className="text-lg font-black text-rose-700 dark:text-rose-400">{csvPreview.invalid_count}</div>
                      <div className="text-[10px] font-semibold uppercase text-rose-600">Invalid Records</div>
                    </div>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Import Preview ({csvPreview.total_rows_processed} detected rows)
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      File: {voterFile?.name} ({(voterFile?.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px]">
                        <tr>
                          <th className="p-2.5">Name</th>
                          <th className="p-2.5">Email</th>
                          <th className="p-2.5">Student ID</th>
                          <th className="p-2.5">Mobile</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {csvPreview.valid_records.slice(0, 15).map((v, i) => (
                          <tr key={`valid-${i}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">{v.name || '—'}</td>
                            <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{v.email}</td>
                            <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{v.student_id || '—'}</td>
                            <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{v.mobile || '—'}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                                VALID
                              </span>
                            </td>
                          </tr>
                        ))}
                        {csvPreview.duplicate_records.slice(0, 5).map((d, i) => (
                          <tr key={`dup-${i}`} className="bg-amber-50/30 dark:bg-amber-950/20">
                            <td className="p-2.5 text-slate-500">{d.name || '—'}</td>
                            <td className="p-2.5 font-mono text-slate-500">{d.email}</td>
                            <td className="p-2.5 font-mono text-slate-500">{d.student_id || '—'}</td>
                            <td className="p-2.5 font-mono text-slate-500">{d.mobile || '—'}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400" title={d.reason}>
                                DUPLICATE
                              </span>
                            </td>
                          </tr>
                        ))}
                        {csvPreview.invalid_records.slice(0, 5).map((inv, i) => (
                          <tr key={`inv-${i}`} className="bg-rose-50/30 dark:bg-rose-950/20">
                            <td className="p-2.5 text-slate-500">{inv.name || '—'}</td>
                            <td className="p-2.5 font-mono text-rose-500">{inv.email || '(Empty)'}</td>
                            <td className="p-2.5 font-mono text-slate-500">{inv.student_id || '—'}</td>
                            <td className="p-2.5 font-mono text-slate-500">{inv.mobile || '—'}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400" title={inv.reason}>
                                INVALID
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Import Confirmation Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => { setVoterFile(null); setCsvPreview(null); }}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Cancel & Upload Different File
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={csvPreview.valid_count === 0 || isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>Import {csvPreview.valid_count} Valid Voters</span>
                  </button>
                </div>
              </div>
            )}

            {/* Post-Import Success Screen */}
            {csvImported && (
              <div className="p-6 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    Voter Roster Imported Successfully
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    {importedVoterCount} eligible voter records have been securely stored in this election's isolated registry.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setCsvImported(false); setVoterFile(null); setCsvPreview(null); }}
                  className="text-xs text-emerald-600 font-semibold hover:underline"
                >
                  Upload additional / replacement list
                </button>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            STEP 5: VERIFICATION SETTINGS
            ========================================================= */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Step 5: Election Verification Settings
              </h2>
              <p className="text-xs text-slate-500">
                Configure identity challenge protocols required before a voter can enter the voting booth.
              </p>
            </div>

            <div className="space-y-4">
              {/* Email OTP Toggle */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                    <Mail className="w-4 h-4 text-indigo-600" />
                    <span>Email OTP Challenge</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Sends a 6-digit cryptographic verification code to the voter's roster email address prior to ballot access.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verificationConfig.require_email_otp}
                    onChange={(e) => setVerificationConfig({ ...verificationConfig, require_email_otp: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                </label>
              </div>

              {/* Webcam Face Verification Toggle */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>Webcam Face Recognition Match</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Captures a live snapshot and performs deep neural network face matching (OpenCV SFace) to verify physical voter presence.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verificationConfig.require_webcam_verification}
                    onChange={(e) => setVerificationConfig({ ...verificationConfig, require_webcam_verification: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            STEP 6: REVIEW & PUBLISH
            ========================================================= */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Step 6: Review & Finalize
              </h2>
              <p className="text-xs text-slate-500">
                Inspect your election parameters before publishing. Configuration is locked once voting commences.
              </p>
            </div>

            <div className="space-y-4">
              {/* Details Review */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Election Details</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Title:</span>
                    <div className="font-semibold text-slate-900 dark:text-white">{basicInfo.title}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Organization:</span>
                    <div className="font-semibold text-slate-900 dark:text-white">{basicInfo.organization || 'None specified'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Type:</span>
                    <div className="font-semibold text-slate-900 dark:text-white capitalize">{basicInfo.election_type}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Category:</span>
                    <div className="font-semibold text-slate-900 dark:text-white">{basicInfo.position_category || 'General'}</div>
                  </div>
                </div>
              </div>

              {/* Candidates Review */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Candidates Slate</span>
                  <span className="text-xs font-mono text-indigo-600 font-bold">{candidates.length} Registered</span>
                </div>
                {candidates.length === 0 ? (
                  <div className="text-xs text-amber-600 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>No candidates added yet. You can still save as draft.</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {candidates.map((c, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 font-medium">
                        {c.full_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Voter Roll Review */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Eligible Voter Roster</span>
                  <span className="text-xs font-mono text-emerald-600 font-bold">
                    {csvImported ? `${importedVoterCount} Voters Imported` : 'Not uploaded yet'}
                  </span>
                </div>
                {!csvImported && (
                  <div className="text-xs text-amber-600 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>No voter list uploaded yet. Eligible voters can also be uploaded from the workspace after saving.</span>
                  </div>
                )}
              </div>

              {/* Verification Review */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Identity Verification Protocols</span>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    {verificationConfig.require_email_otp ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-slate-400" />}
                    <span>Email OTP</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {verificationConfig.require_webcam_verification ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-slate-400" />}
                    <span>Webcam Face Recognition</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40"
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
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleFinalSubmit(true)}
                  disabled={isSubmitting || !basicInfo.title}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/35 transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Finalizing...' : 'Publish Election'}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/35 transition-all"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
