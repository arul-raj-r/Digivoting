import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import electionApi from '../../services/electionApi';
import { 
  PlusCircle, 
  ArrowLeft, 
  Vote, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Users,
  ShieldCheck,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  Camera,
  Mail,
  Lock
} from 'lucide-react';

export default function CreateElection() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Details
    title: '',
    description: '',
    election_type: 'academic',
    organization: '',
    category: 'Institutional Governance',
    instructions: 'Please select one candidate for each contested office. Your vote is confidential.',

    // Step 4: Verification Configuration
    require_email_otp: true,
    require_webcam_verification: true,

    // Step 5: Schedule & Rules
    start_datetime: '',
    end_datetime: '',
    allow_write_in: false,
    max_choices: 1
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = [
    { number: 1, title: 'Details & Type' },
    { number: 2, title: 'Candidates' },
    { number: 3, title: 'Voter Roll' },
    { number: 4, title: 'Verification' },
    { number: 5, title: 'Schedule & Rules' },
    { number: 6, title: 'Review & Publish' }
  ];

  const validateStep = () => {
    const errs = {};
    if (currentStep === 1) {
      if (!formData.title.trim()) errs.title = 'Election title is required.';
      else if (formData.title.trim().length < 3) errs.title = 'Title must be at least 3 characters.';
      if (!formData.description.trim()) errs.description = 'Description is required.';
      else if (formData.description.trim().length < 10) errs.description = 'Please provide at least 10 characters.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(6, prev + 1));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleCreateElection = async (publishImmediately = false) => {
    if (!validateStep()) return;

    setIsSubmitting(true);
    setErrors({});
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        election_type: formData.election_type,
        start_datetime: formData.start_datetime || null,
        end_datetime: formData.end_datetime || null,
      };

      const created = await electionApi.createElection(payload);

      // Save verification configuration
      await electionApi.updateVerificationConfig(created.id, {
        require_email_otp: formData.require_email_otp,
        require_webcam_verification: formData.require_webcam_verification,
      }).catch(() => null);

      if (publishImmediately) {
        await electionApi.startElection(created.id).catch(() => null);
      }

      navigate(`/creator/elections/${created.id}`);
    } catch (err) {
      console.error('Failed to create election:', err);
      setErrors({ form: err.response?.data?.error || err.message || 'Failed to initialize election.' });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      
      {/* Header & Back Link */}
      <div className="space-y-3">
        <Link 
          to="/creator/elections"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Elections Directory</span>
        </Link>

        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-600/20 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                MODULE 2: WIZARD CONFIGURATION
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Create New Election
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
            Configure election details, setup candidate slates, specify voter eligibility rolls, and activate webcam face verification protocols.
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-[580px] text-xs">
          {steps.map((step) => {
            const isCompleted = currentStep > step.number;
            const isCurrent = currentStep === step.number;
            return (
              <div 
                key={step.number}
                onClick={() => isCompleted && setCurrentStep(step.number)}
                className={`flex items-center gap-2 cursor-pointer ${
                  isCurrent ? 'font-bold text-indigo-600 dark:text-indigo-400' : isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] ${
                  isCurrent ? 'bg-indigo-600 text-white' : isCompleted ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800'
                }`}>
                  {isCompleted ? '✓' : step.number}
                </div>
                <span>{step.title}</span>
                {step.number < 6 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-1 shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        
        {errors.form && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        {/* STEP 1: Details & Type */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Step 1: Election Details & Scope
              </h2>
              <p className="text-xs text-slate-500">Specify the official title and organizational classification.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Election Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Student Council Executive Election 2026"
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {errors.title && <p className="text-[11px] text-rose-500">{errors.title}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Election Classification / Type
                </label>
                <select
                  value={formData.election_type}
                  onChange={(e) => setFormData({ ...formData, election_type: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="academic">Academic / University Student Government</option>
                  <option value="club">Club, Society or Association Leadership</option>
                  <option value="workplace">Workplace Committee or Faculty Council</option>
                  <option value="poll">Institutional Opinion Survey or Priority Poll</option>
                  <option value="general">General Organizational Ballot</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Description & Context *
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the mandate, contested offices, and importance of voter participation..."
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {errors.description && <p className="text-[11px] text-rose-500">{errors.description}</p>}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Candidate Slate */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Step 2: Candidate Configuration Notice
              </h2>
              <p className="text-xs text-slate-500">
                You will add candidate slates, photos, and manifestos in the Election Hub immediately after creating the election draft.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Candidate Slate Capabilities</span>
              </h3>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed">
                <li>Dynamic nominee profiles with photo uploads</li>
                <li>Comprehensive candidate manifesto attachments</li>
                <li>Position ordering and candidate approval status controls</li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 3: Voter Roll & Eligibility */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Step 3: Voter Roll & Eligibility Rules
              </h2>
              <p className="text-xs text-slate-500">
                Configure eligible voter whitelists. You can add individual members or bulk import CSV lists in the Election Hub.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Voters must be present on the certified voter roll for this contest. When they sign in, DigiVote automatically matches their authenticated identity to verify eligibility.
              </p>
            </div>
          </div>
        )}

        {/* STEP 4: Verification Configuration */}
        {currentStep === 4 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Step 4: Identity Verification Protocols
              </h2>
              <p className="text-xs text-slate-500">
                Select required security challenges voters must complete before receiving single-use voting authorization.
              </p>
            </div>

            <div className="space-y-4">
              {/* Email OTP Challenge */}
              <label className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-start gap-4 cursor-pointer hover:border-indigo-500 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.require_email_otp}
                  onChange={(e) => setFormData({ ...formData, require_email_otp: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 mt-1"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Email OTP Challenge (Recommended)</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Dispatches a cryptographically secure 6-digit one-time passcode to voter's registered email with 10-minute expiry.
                  </p>
                </div>
              </label>

              {/* Webcam Face Verification */}
              <label className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-start gap-4 cursor-pointer hover:border-indigo-500 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.require_webcam_verification}
                  onChange={(e) => setFormData({ ...formData, require_webcam_verification: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 mt-1"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Webcam Face Recognition (OpenCV ArcFace)</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Captures live webcam stream in the browser and matches facial biometric embeddings using Deep Neural Networks.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* STEP 5: Schedule & Rules */}
        {currentStep === 5 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Step 5: Voting Schedule & Timing
              </h2>
              <p className="text-xs text-slate-500">Specify when voting polls open and close.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Poll Opening Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_datetime}
                  onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Poll Closing Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_datetime}
                  onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Review & Publish */}
        {currentStep === 6 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Step 6: Review Configuration & Create
              </h2>
              <p className="text-xs text-slate-500">
                Review your election configuration before initializing the contest.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Title:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formData.title}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Classification:</span>
                <span className="capitalize text-slate-800 dark:text-slate-200">{formData.election_type}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Email OTP:</span>
                <span className="font-semibold text-emerald-600">{formData.require_email_otp ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">ArcFace Webcam Biometrics:</span>
                <span className="font-semibold text-emerald-600">{formData.require_webcam_verification ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Lock Rule:</span>
                <span className="text-amber-600 font-semibold">Locks automatically upon voting start</span>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
          >
            Back
          </button>

          <div className="flex items-center gap-3">
            {currentStep < 6 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCreateElection(false)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{isSubmitting ? 'Initializing...' : 'Save Draft & Configure Hub'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
