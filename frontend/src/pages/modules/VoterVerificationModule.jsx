import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import electionApi from '../../services/electionApi';
import voterApi from '../../services/voterApi';
import verificationApi from '../../services/verificationApi';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import { 
  ShieldCheck, 
  UserCheck, 
  Camera, 
  Mail, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  RefreshCw, 
  Vote,
  Key,
  Shield,
  Search,
  Check,
  ChevronRight,
  Eye
} from 'lucide-react';

export default function VoterVerificationModule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetElectionId = searchParams.get('election');

  const role = user?.role || 'VOTER';
  const isOrganizer = role === 'ELECTION_CREATOR' || role === 'ADMIN' || user?.is_staff || user?.is_superuser;

  // Active Elections for selection
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState(targetElectionId || '');
  const [loadingElections, setLoadingElections] = useState(true);

  // Eligibility & Verification State
  const [eligibilityData, setEligibilityData] = useState(null);
  const [loadingEligibility, setLoadingEligibility] = useState(false);
  const [eligibilityError, setEligibilityError] = useState(null);

  // Step 2: Email OTP State
  const [otpCode, setOtpCode] = useState('');
  const [otpChallengeId, setOtpChallengeId] = useState(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Step 3: Webcam & Face Recognition State
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [faceVerifying, setFaceVerifying] = useState(false);
  const [faceSuccess, setFaceSuccess] = useState(false);
  const [faceError, setFaceError] = useState(null);
  const [faceDetails, setFaceDetails] = useState(null);

  // Step 4: Voting Authorization Token State
  const [authorizing, setAuthorizing] = useState(false);
  const [authorizationData, setAuthorizationData] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Organizer Voter Roster State
  const [voterRoster, setVoterRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');

  // Fetch elections list
  useEffect(() => {
    const fetchElections = async () => {
      setLoadingElections(true);
      try {
        const data = await electionApi.getElections();
        const list = Array.isArray(data) ? data : (data.results || []);
        setElections(list);
        if (!selectedElectionId && list.length > 0) {
          setSelectedElectionId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load elections:', err);
      } finally {
        setLoadingElections(false);
      }
    };
    fetchElections();
  }, []);

  // Fetch eligibility when selected election changes
  const checkEligibility = async (electionId) => {
    if (!electionId) return;
    setLoadingEligibility(true);
    setEligibilityError(null);
    setOtpSuccess(false);
    setFaceSuccess(false);
    setAuthorizationData(null);
    try {
      const res = await verificationApi.getEligibility(electionId);
      setEligibilityData(res);
      if (res.verification_progress?.otp_verified) setOtpSuccess(true);
      if (res.verification_progress?.face_verified) setFaceSuccess(true);
    } catch (err) {
      setEligibilityError(err.response?.data?.error || err.message || 'Failed to check eligibility.');
      setEligibilityData(null);
    } finally {
      setLoadingEligibility(false);
    }
  };

  // Fetch organizer roster if user is organizer
  const fetchRoster = async (electionId) => {
    if (!isOrganizer || !electionId) return;
    setLoadingRoster(true);
    try {
      const res = await voterApi.getEligibleVoters(electionId);
      setVoterRoster(res.voters || res.results || (Array.isArray(res) ? res : []));
    } catch (err) {
      console.warn('Could not load roster:', err);
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    if (selectedElectionId) {
      checkEligibility(selectedElectionId);
      if (isOrganizer) fetchRoster(selectedElectionId);
    }
  }, [selectedElectionId, isOrganizer]);

  // Countdown timer for OTP cooldown
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const interval = setInterval(() => {
      setOtpCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCooldown]);

  // Camera cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Camera controllers
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Webcam access was denied or is unavailable. Please grant browser camera permissions.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  // Step 2: Handle Request OTP
  const handleRequestOtp = async () => {
    setOtpSending(true);
    setOtpError(null);
    try {
      const res = await verificationApi.requestOtp(selectedElectionId);
      setOtpChallengeId(res.challenge_id);
      setOtpCooldown(60);
    } catch (err) {
      setOtpError(err.response?.data?.error || 'Failed to send verification code.');
    } finally {
      setOtpSending(false);
    }
  };

  // Step 2: Handle Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setOtpError('Please enter a valid 6-digit verification code.');
      return;
    }
    setOtpVerifying(true);
    setOtpError(null);
    try {
      await verificationApi.verifyOtp(selectedElectionId, otpCode, otpChallengeId);
      setOtpSuccess(true);
      await checkEligibility(selectedElectionId);
    } catch (err) {
      setOtpError(err.response?.data?.error || 'Invalid verification code.');
    } finally {
      setOtpVerifying(false);
    }
  };

  // Step 3: Handle Face Capture & Verification
  const handleCaptureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setCapturing(true);
    setFaceError(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL('image/jpeg', 0.9);
    setCapturing(false);
    setFaceVerifying(true);

    try {
      const res = await verificationApi.verifyFace(selectedElectionId, base64Image);
      if (res.verified) {
        setFaceSuccess(true);
        setFaceDetails(res);
        stopCamera();
        await checkEligibility(selectedElectionId);
      } else {
        setFaceError(res.error || 'Face could not be verified with sufficient confidence.');
      }
    } catch (err) {
      setFaceError(err.response?.data?.error || 'Facial recognition failed. Please face the camera directly with good lighting.');
    } finally {
      setFaceVerifying(false);
    }
  };

  // Step 4: Issue One-Time Voting Authorization Token
  const handleGenerateAuthorization = async () => {
    setAuthorizing(true);
    setAuthError(null);
    try {
      const res = await verificationApi.getVotingAuthorization(selectedElectionId);
      setAuthorizationData(res);
      // Persist token for the voting booth
      sessionStorage.setItem(`digivote_auth_${selectedElectionId}`, res.authorization_token);
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Unable to issue voting authorization.');
    } finally {
      setAuthorizing(false);
    }
  };

  const handleProceedToBooth = () => {
    navigate(`/elections/${selectedElectionId}/vote`);
  };

  const requireOtp = eligibilityData?.verification_config?.require_email_otp ?? true;
  const requireFace = eligibilityData?.verification_config?.require_webcam_verification ?? true;
  const canAuthorize = (otpSuccess || !requireOtp) && (faceSuccess || !requireFace);

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              MODULE 3: IDENTITY PROTOCOL
            </span>
            <span className="text-xs text-slate-400">
              ArcFace DNN Verification
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Voter Verification Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
            Verify voter clearance and identity before casting ballots. Complete multi-factor verification to obtain single-use cryptographic voting authorization.
          </p>
        </div>

        {/* Election Selector Dropdown */}
        <div className="w-full md:w-72 space-y-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Target Election:
          </label>
          <select
            value={selectedElectionId}
            onChange={(e) => setSelectedElectionId(e.target.value)}
            disabled={loadingElections}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {elections.map(el => (
              <option key={el.id} value={el.id}>
                {el.title} ({el.status.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Verification Stepper */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Verification Pipeline Card */}
        <div className="lg:col-span-8 space-y-6">
          
          {loadingEligibility ? (
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <LoadingSkeleton variant="header" />
              <LoadingSkeleton variant="cards" count={2} />
            </div>
          ) : eligibilityError ? (
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Verification Not Available
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  {eligibilityError}
                </p>
              </div>
              <button
                type="button"
                onClick={() => checkEligibility(selectedElectionId)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all inline-flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Clearance Check</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* STEP 1: Eligibility Check */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Voter Roll Eligibility
                      </h3>
                      <p className="text-xs text-slate-500">
                        Registered email: <span className="font-mono text-slate-700 dark:text-slate-300">{user?.email}</span>
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Eligible & Cleared
                  </span>
                </div>
              </div>

              {/* STEP 2: Email OTP Challenge */}
              {requireOtp && (
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        otpSuccess 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      }`}>
                        2
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Email OTP Two-Factor Authentication
                        </h3>
                        <p className="text-xs text-slate-500">
                          Receive and verify a secure 6-digit one-time passcode.
                        </p>
                      </div>
                    </div>

                    {otpSuccess && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        OTP Verified
                      </span>
                    )}
                  </div>

                  {!otpSuccess && (
                    <div className="space-y-4 pt-2">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <button
                          type="button"
                          onClick={handleRequestOtp}
                          disabled={otpSending || otpCooldown > 0}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center gap-2 shrink-0"
                        >
                          <Mail className="w-4 h-4" />
                          <span>{otpCooldown > 0 ? `Resend in ${otpCooldown}s` : (otpSending ? 'Sending...' : 'Send Verification OTP')}</span>
                        </button>
                        <span className="text-xs text-slate-400">
                          Code will be sent to your verified registered email address.
                        </span>
                      </div>

                      {otpError && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                          <XCircle className="w-4 h-4 shrink-0" />
                          <span>{otpError}</span>
                        </div>
                      )}

                      <form onSubmit={handleVerifyOtp} className="flex items-center gap-3 max-w-sm">
                        <input
                          type="text"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="Enter 6-digit code"
                          className="w-full px-4 py-2 rounded-xl text-sm font-mono text-center tracking-widest bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <button
                          type="submit"
                          disabled={otpVerifying || otpCode.length !== 6}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all shrink-0 flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>{otpVerifying ? 'Verifying...' : 'Verify'}</span>
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Real Browser Webcam Face Verification */}
              {requireFace && (
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        faceSuccess 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      }`}>
                        3
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Biometric Face Verification
                        </h3>
                        <p className="text-xs text-slate-500">
                          Real-time browser webcam capture analyzed by OpenCV YuNet + ArcFace SFace.
                        </p>
                      </div>
                    </div>

                    {faceSuccess && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Face Verified
                      </span>
                    )}
                  </div>

                  {!faceSuccess ? (
                    <div className="space-y-4 pt-2">
                      
                      {/* Camera Viewport with 3D Face Guide */}
                      <div className="relative aspect-video max-w-md mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                        
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                        />
                        <canvas ref={canvasRef} className="hidden" />

                        {/* Visual Biometric Guide Overlay */}
                        {cameraActive && (
                          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                            {/* Scanning oval / Target */}
                            <div className="w-48 h-64 border-2 border-dashed border-indigo-400/80 rounded-[50%] relative flex items-center justify-center">
                              <div className="w-full h-0.5 bg-indigo-500/80 absolute" />
                            </div>
                            <span className="mt-3 text-[11px] font-mono text-indigo-300 font-bold px-2.5 py-1 rounded-full bg-slate-900/90 border border-indigo-500/30">
                              POSITION FACE INSIDE GUIDE
                            </span>
                          </div>
                        )}

                        {/* Inactive Camera Placeholder */}
                        {!cameraActive && (
                          <div className="text-center p-6 space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-slate-400 border border-slate-800 flex items-center justify-center mx-auto">
                              <Camera className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">Camera Standby</p>
                              <p className="text-[11px] text-slate-400">Click below to activate your browser webcam.</p>
                            </div>
                          </div>
                        )}

                      </div>

                      {cameraError && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                          <XCircle className="w-4 h-4 shrink-0" />
                          <span>{cameraError}</span>
                        </div>
                      )}

                      {faceError && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{faceError}</span>
                        </div>
                      )}

                      {/* Camera Controls */}
                      <div className="flex items-center justify-center gap-3">
                        {!cameraActive ? (
                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all flex items-center gap-2"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Activate Webcam</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={handleCaptureAndVerify}
                              disabled={capturing || faceVerifying}
                              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
                            >
                              <ShieldCheck className="w-4 h-4" />
                              <span>{faceVerifying ? 'Verifying Facial Match...' : 'Capture & Verify Identity'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={stopCamera}
                              className="px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>

                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1 text-xs">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Biometric Recognition Passed</span>
                      </div>
                      <p className="text-slate-500">
                        {faceDetails?.message || 'Face matched against enrolled credentials with OpenCV SFace Deep Neural Network.'}
                      </p>
                    </div>
                  )}

                </div>
              )}

              {/* STEP 4: One-Time Single-Use Voting Authorization */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      authorizationData
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    }`}>
                      4
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Single-Use Voting Authorization
                      </h3>
                      <p className="text-xs text-slate-500">
                        Cryptographic 15-minute token allowing you to cast your ballot.
                      </p>
                    </div>
                  </div>

                  {authorizationData && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Authorized
                    </span>
                  )}
                </div>

                {authError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                {!authorizationData ? (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleGenerateAuthorization}
                      disabled={!canAuthorize || authorizing}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Key className="w-4 h-4" />
                      <span>{authorizing ? 'Issuing Authorization...' : 'Grant Voting Authorization'}</span>
                    </button>
                    {!canAuthorize && (
                      <p className="text-[11px] text-amber-500 mt-2">
                        * You must complete all prior verification steps above before authorization can be generated.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        ONE-TIME AUTHORIZATION ISSUED
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Token is active for 15 minutes. Valid only for your authenticated session in this contest.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleProceedToBooth}
                      className="w-full py-3 px-6 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
                    >
                      <Vote className="w-4 h-4" />
                      <span>Proceed to Voting Booth</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

              </div>

            </div>
          )}

        </div>

        {/* Verification Requirements & Context Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500" />
              <span>Verification Protocol</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Email OTP Challenge:</span>
                <span className={`font-semibold ${requireOtp ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {requireOtp ? 'Mandatory' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">ArcFace Recognition:</span>
                <span className={`font-semibold ${requireFace ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {requireFace ? 'Mandatory (OpenCV)' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Authorization Lifespan:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">15 Minutes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Ballot Anonymity:</span>
                <span className="font-semibold text-emerald-600">Preserved</span>
              </div>
            </div>
          </div>

          {/* Organizer Voter Roster Quick View */}
          {isOrganizer && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Eligible Voters ({voterRoster.length})
                </h3>
                <span className="text-[10px] font-bold text-indigo-600 uppercase">Roster</span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {voterRoster.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No voters registered on roll yet.</p>
                ) : (
                  voterRoster.map((voter) => (
                    <div key={voter.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">{voter.name || voter.email}</p>
                        <p className="text-[10px] text-slate-400 truncate">{voter.email}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        voter.has_voted ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}>
                        {voter.has_voted ? 'VOTED' : 'PENDING'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
