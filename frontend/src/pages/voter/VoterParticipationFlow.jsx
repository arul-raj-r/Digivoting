import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { verificationApi } from '../../services/verificationApi';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import { 
  Vote, 
  ShieldCheck, 
  UserCheck, 
  Mail, 
  Camera, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  ArrowLeft, 
  RefreshCw, 
  Lock, 
  Building2, 
  Key, 
  Shield, 
  Check, 
  X,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

export default function VoterParticipationFlow() {
  const { id: routeElectionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Available elections list state
  const [availableElections, setAvailableElections] = useState([]);
  const [loadingElections, setLoadingElections] = useState(true);

  // Selected Election state
  const [selectedElectionId, setSelectedElectionId] = useState(routeElectionId || '');
  const [electionDetails, setElectionDetails] = useState(null);

  // Step 1: Eligibility Check State
  const [voterInput, setVoterInput] = useState({
    email: user?.email || '',
    student_id: '',
  });
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [eligibilityError, setEligibilityError] = useState(null);

  // Step 2: Email OTP State
  const [otpCode, setOtpCode] = useState('');
  const [otpChallengeId, setOtpChallengeId] = useState(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Step 3: Webcam Face Verification State
  const videoRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [faceVerifying, setFaceVerifying] = useState(false);
  const [faceSuccess, setFaceSuccess] = useState(false);
  const [faceError, setFaceError] = useState(null);

  // Step 4: Voting Authorization Token
  const [votingAuth, setVotingAuth] = useState(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Cooldown countdown timer
  useEffect(() => {
    let timer;
    if (otpCooldown > 0) {
      timer = setInterval(() => setOtpCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // Fetch available elections where this user is on the eligible roster
  const fetchAvailableElections = async () => {
    setLoadingElections(true);
    try {
      const res = await api.get('/voter/elections/');
      const list = res.data?.elections || [];
      setAvailableElections(list);

      // If route has an ID, verify presence
      if (routeElectionId) {
        setSelectedElectionId(routeElectionId);
      } else if (list.length > 0 && !selectedElectionId) {
        setSelectedElectionId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load voter elections:', err);
    } finally {
      setLoadingElections(false);
    }
  };

  useEffect(() => {
    fetchAvailableElections();
  }, []);

  // Update URL and reset verification state when election changes
  const handleSelectElection = (electionId) => {
    setSelectedElectionId(electionId);
    setEligibilityResult(null);
    setEligibilityError(null);
    setOtpSuccess(false);
    setFaceSuccess(false);
    setVotingAuth(null);
    stopCamera();
    navigate(`/elections/${electionId}/vote`);
  };

  // STEP 1: Run Server-Side Eligibility Match
  const handleCheckEligibility = async (e) => {
    e?.preventDefault();
    if (!selectedElectionId) return;

    setIsCheckingEligibility(true);
    setEligibilityError(null);
    setEligibilityResult(null);

    try {
      const res = await api.post(`/elections/${selectedElectionId}/eligibility/check/`, {
        email: voterInput.email,
        student_id: voterInput.student_id,
      });

      setEligibilityResult(res.data);
      setElectionDetails(res.data.election);

      // Check if already has active authorization
      if (res.data.has_active_authorization) {
        setVotingAuth({
          token: 'Active Session Token',
          expires_at: res.data.authorization_expires_at
        });
      }
      if (res.data.verification_progress?.otp_verified) {
        setOtpSuccess(true);
      }
      if (res.data.verification_progress?.face_verified) {
        setFaceSuccess(true);
      }
    } catch (err) {
      console.error('Eligibility check error:', err);
      const data = err.response?.data;
      setEligibilityError(data?.error || data?.message || 'Eligibility check failed.');
      setEligibilityResult(data);
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  // STEP 2: Request Email OTP
  const handleRequestOtp = async () => {
    setOtpSending(true);
    setOtpError(null);
    try {
      const res = await verificationApi.requestOtp(selectedElectionId);
      setOtpChallengeId(res.challenge_id);
      setOtpCooldown(60);
    } catch (err) {
      setOtpError(err.response?.data?.error || 'Failed to send OTP code.');
    } finally {
      setOtpSending(false);
    }
  };

  // Verify Email OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setOtpError('Please enter a valid 6-digit code.');
      return;
    }

    setOtpVerifying(true);
    setOtpError(null);
    try {
      const res = await verificationApi.verifyOtp(selectedElectionId, otpCode, otpChallengeId);
      if (res.verified) {
        setOtpSuccess(true);
      }
    } catch (err) {
      setOtpError(err.response?.data?.error || 'OTP verification failed.');
    } finally {
      setOtpVerifying(false);
    }
  };

  // STEP 3: Camera & Face Recognition
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access webcam. Please ensure camera permissions are granted.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const captureAndVerifyFace = async () => {
    if (!videoRef.current) return;
    setFaceVerifying(true);
    setFaceError(null);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.9);

      const res = await verificationApi.verifyFace(selectedElectionId, imageBase64);
      if (res.verified) {
        setFaceSuccess(true);
        stopCamera();
      } else {
        setFaceError(res.error || 'Face verification match failed.');
      }
    } catch (err) {
      setFaceError(err.response?.data?.error || 'Face recognition matching failed.');
    } finally {
      setFaceVerifying(false);
    }
  };

  // STEP 4: Request One-Time Voting Authorization
  const handleRequestAuthorization = async () => {
    setIsAuthorizing(true);
    setAuthError(null);

    try {
      const res = await verificationApi.getVotingAuthorization(selectedElectionId);
      setVotingAuth({
        token: res.authorization_token,
        expires_at: res.expires_at,
        valid_minutes: res.valid_minutes || 15
      });
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Could not grant voting authorization.');
    } finally {
      setIsAuthorizing(false);
    }
  };

  if (loadingElections) {
    return (
      <div className="space-y-6 pb-12">
        <LoadingSkeleton variant="header" />
        <LoadingSkeleton variant="cards" count={3} />
      </div>
    );
  }

  const selectedElectionMeta = availableElections.find(e => e.id === selectedElectionId);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Vote className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Voting Booth & Verification Portal
            </h1>
            <p className="text-xs text-slate-500">
              Only elections for which you are on the creator's eligible voter roster are available.
            </p>
          </div>
        </div>
      </div>

      {/* Available Elections Selector */}
      {availableElections.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-3">
          <Vote className="w-10 h-10 mx-auto text-slate-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No elections currently available for your account
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You are not currently listed on any active or scheduled election rosters. If you believe this is an error, please contact your election organizer.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Election Picker Dropdown/Cards */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Select Election:</span>
              <select
                value={selectedElectionId}
                onChange={(e) => handleSelectElection(e.target.value)}
                className="w-full sm:max-w-md px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              >
                {availableElections.map((el) => (
                  <option key={el.id} value={el.id}>
                    {el.title} {el.has_voted ? '(Already Voted)' : `(${el.status})`}
                  </option>
                ))}
              </select>
            </div>

            {selectedElectionMeta && (
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedElectionMeta.status} />
                {selectedElectionMeta.has_voted && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    Voted
                  </span>
                )}
              </div>
            )}
          </div>

          {/* =========================================================
              STEP 1: ELIGIBILITY CHECK
              ========================================================= */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>Step 1: Check Election Eligibility</span>
              </div>
              {eligibilityResult?.eligible && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Roster Match Confirmed</span>
                </span>
              )}
            </div>

            {!eligibilityResult?.eligible ? (
              <form onSubmit={handleCheckEligibility} className="space-y-4 max-w-md">
                <p className="text-xs text-slate-500">
                  Verify your eligibility to participate in this election against the election creator's uploaded roster.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Registered Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={voterInput.email}
                      onChange={(e) => setVoterInput({ ...voterInput, email: e.target.value })}
                      placeholder="e.g. voter@institution.edu"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Student ID / Voter ID (If required by roster)
                    </label>
                    <input
                      type="text"
                      value={voterInput.student_id}
                      onChange={(e) => setVoterInput({ ...voterInput, student_id: e.target.value })}
                      placeholder="e.g. 24UCS019"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {eligibilityError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{eligibilityError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isCheckingEligibility}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isCheckingEligibility ? 'Verifying with Roster...' : 'Verify My Eligibility'}</span>
                </button>
              </form>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Match Found: You are verified as eligible to participate in this election.</span>
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 grid grid-cols-2 gap-2 pt-1 font-mono">
                  <div>Voter: <span className="font-bold">{eligibilityResult.voter?.name}</span></div>
                  <div>Email: <span className="font-bold">{eligibilityResult.voter?.email}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* =========================================================
              STEP 2: EMAIL OTP VERIFICATION (IF REQUIRED)
              ========================================================= */}
          {eligibilityResult?.eligible && eligibilityResult.verification_config?.require_email_otp && (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <span>Step 2: Email OTP Challenge</span>
                </div>
                {otpSuccess && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>OTP Verified</span>
                  </span>
                )}
              </div>

              {!otpSuccess ? (
                <div className="space-y-4 max-w-md">
                  <p className="text-xs text-slate-500">
                    A 6-digit one-time passcode will be dispatched to your registered roster email.
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      disabled={otpSending || otpCooldown > 0}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-semibold disabled:opacity-50"
                    >
                      {otpSending ? 'Sending...' : otpCooldown > 0 ? `Resend code in ${otpCooldown}s` : 'Request OTP Code'}
                    </button>
                    {otpCooldown > 0 && (
                      <span className="text-[11px] text-slate-400">Code sent to {eligibilityResult.voter?.email}</span>
                    )}
                  </div>

                  <form onSubmit={handleVerifyOtp} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Enter 6-Digit OTP
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-40 tracking-widest text-center text-base font-mono font-bold px-3 py-2 rounded-xl bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    {otpError && (
                      <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{otpError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={otpVerifying || otpCode.length !== 6}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
                    >
                      <span>{otpVerifying ? 'Verifying...' : 'Verify OTP'}</span>
                    </button>
                  </form>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Email OTP successfully validated. Identity challenge passed.</span>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              STEP 3: WEBCAM FACE VERIFICATION (IF REQUIRED)
              ========================================================= */}
          {eligibilityResult?.eligible && eligibilityResult.verification_config?.require_webcam_verification && (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>Step 3: Live Webcam Face Verification</span>
                </div>
                {faceSuccess && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Face Match Confirmed</span>
                  </span>
                )}
              </div>

              {!faceSuccess ? (
                <div className="space-y-4 max-w-md">
                  <p className="text-xs text-slate-500">
                    Perform a live webcam face check to confirm voter presence against institutional biometric standards.
                  </p>

                  {!cameraActive ? (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/25 hover:bg-indigo-700"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Start Camera</span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-w-sm border border-slate-300 dark:border-slate-700">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        <div className="absolute inset-0 border-2 border-dashed border-indigo-400/60 pointer-events-none m-4 rounded-xl" />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={captureAndVerifyFace}
                          disabled={faceVerifying}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          <span>{faceVerifying ? 'Matching Face...' : 'Capture & Verify'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {faceError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{faceError}</span>
                    </div>
                  )}

                  {cameraError && (
                    <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{cameraError}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Face biometric verification successfully confirmed with neural embeddings.</span>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              STEP 4: ONE-TIME VOTING AUTHORIZATION & BOUNDARY
              ========================================================= */}
          {eligibilityResult?.eligible && (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                  <Key className="w-4 h-4 text-indigo-600" />
                  <span>Step 4: One-Time Cryptographic Voting Authorization</span>
                </div>
                {votingAuth && (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    AUTHORIZED
                  </span>
                )}
              </div>

              {!votingAuth ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Once all required verification steps are satisfied, the server will issue a cryptographically signed, single-use 15-minute voting authorization token.
                  </p>

                  {authError && (
                    <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleRequestAuthorization}
                    disabled={isAuthorizing || (eligibilityResult.verification_config?.require_email_otp && !otpSuccess) || (eligibilityResult.verification_config?.require_webcam_verification && !faceSuccess)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 disabled:opacity-40 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isAuthorizing ? 'Issuing Authorization...' : 'Issue One-Time Voting Authorization'}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                      <span>Single-Use Voting Authorization Active</span>
                    </div>
                    <p className="text-xs text-indigo-800 dark:text-indigo-300">
                      Your identity and eligibility have been cryptographically authenticated by the DigiVote server.
                    </p>
                    <div className="text-[11px] font-mono text-slate-500 flex flex-wrap gap-4 pt-1">
                      <div>Status: <span className="text-emerald-600 font-bold">READY TO VOTE</span></div>
                      <div>Token Expiry: <span className="font-bold">{new Date(votingAuth.expires_at).toLocaleTimeString()}</span></div>
                    </div>
                  </div>

                  {/* Phase Boundary Notice */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Phase 1 Verification Boundary Complete</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      All prerequisites (Roster Eligibility, Email OTP, and Face Recognition) are verified. Final candidate selection, zero-knowledge ballot encryption, and tally computation will be unlocked in the upcoming Voting Module.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
