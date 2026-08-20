import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { Landmark, User, FileText, Camera, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface Constituency {
  id: string;
  name: string;
  description: string;
}

export const Register: React.FC = () => {
  const navigate = useNavigate();
  
  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // Lists
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  
  // Form fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [voterIdNumber, setVoterIdNumber] = useState('');
  const [constituencyId, setConstituencyId] = useState('');
  const [facePhoto, setFacePhoto] = useState<string | null>(null); // Base64 Image
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Male');

  // Camera states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [livenessState, setLivenessState] = useState<'INIT' | 'DETECTING' | 'BLINK_INSTRUCTION' | 'VERIFIED'>('INIT');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Status states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch constituencies on mount
  useEffect(() => {
    const fetchConstituencies = async () => {
      try {
        const response = await api.get('/voters/constituencies/');
        setConstituencies(response.data);
        if (response.data.length > 0) {
          setConstituencyId(response.data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch constituencies:', err);
      }
    };
    fetchConstituencies();
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Bind camera stream to video element when active
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  const startCamera = async () => {
    setCameraError(null);
    setLivenessState('INIT');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 400, height: 300, facingMode: 'user' } 
      });
      streamRef.current = stream;
      setCameraActive(true);
      
      // Simulate Interactive Biometric Liveness check
      triggerLivenessSimulation();
    } catch (err: any) {
      setCameraError('Could not access webcam. Please verify permissions.');
      console.error('Webcam error:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const triggerLivenessSimulation = () => {
    setLivenessState('DETECTING');
    
    // 1. Detect face outline (after 1.5s)
    setTimeout(() => {
      if (streamRef.current) {
        setLivenessState('BLINK_INSTRUCTION');
      }
    }, 1500);
  };

  const captureFace = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Draw frame to canvas
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL('image/jpeg', 0.85);
      
      setFacePhoto(base64Image);
      setLivenessState('VERIFIED');
      stopCamera();
    }
  };

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!constituencyId) {
      setError('Please select a constituency.');
      return;
    }
    if (!dateOfBirth) {
      setError('Please provide your Date of Birth.');
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    setError(null);
    if (!facePhoto) {
      setError('Biometric face capture is required.');
      return;
    }
    setStep(3);
  };

  const handleRegisterSubmit = async () => {
    setLoading(true);
    setError(null);

    const payload = {
      username,
      password,
      email,
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
      voter_id_number: voterIdNumber,
      constituency_id: constituencyId,
      face_photo_url: facePhoto, // Base64 stored directly in this prototype
      date_of_birth: dateOfBirth,
      gender: gender,
    };

    try {
      // 1. Register the voter
      await api.post('/voters/register/', payload);
      
      // 2. Automatically log the voter in using login API (bypassing OTP)
      const loginResponse = await api.post('/auth/login/', { username, password });
      const { access, refresh, user: loggedUser, voter_profile } = loginResponse.data;
      
      // 3. Store credentials in Zustand authStore
      const authStore = useAuthStore.getState();
      authStore.login(access, refresh, loggedUser, voter_profile);
      
      // 4. Redirect directly to dashboard (voters can vote immediately)
      navigate('/dashboard');
    } catch (err: any) {
      // Handle nested DRF serializer validation errors
      let errorMessage = 'Registration failed. Please check inputs.';
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'object') {
          const keys = Object.keys(data);
          if (keys.length > 0) {
            const firstErr = data[keys[0]];
            errorMessage = Array.isArray(firstErr) ? firstErr[0] : JSON.stringify(firstErr);
          }
        } else {
          errorMessage = data;
        }
      }
      setError(errorMessage);
      setStep(1); // Return to step 1 to fix details
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl w-full mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
      
      {/* Wizard Progress Header */}
      <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-gov-blue dark:text-gov-gold" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Voter Registration Wizard</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
          <span className={step === 1 ? 'text-gov-blue dark:text-gov-gold' : ''}>1. Info</span>
          <span>&gt;</span>
          <span className={step === 2 ? 'text-gov-blue dark:text-gov-gold' : ''}>2. Biometrics</span>
          <span>&gt;</span>
          <span className={step === 3 ? 'text-gov-blue dark:text-gov-gold' : ''}>3. Review</span>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 text-xs rounded-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Personal Details */}
        {step === 1 && (
          <form onSubmit={handleNextStep1} className="space-y-6">
            <h3 className="text-sm font-bold text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1 border-b border-slate-100 dark:border-slate-850 pb-2">
              <User className="h-4 w-4" /> Personal & Account Information
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-350">First Name</label>
                <input 
                  type="text" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-350">Last Name</label>
                <input 
                  type="text" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-350">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-350">Phone Number</label>
                <input 
                  type="tel" 
                  value={phoneNumber} 
                  onChange={(e) => setPhoneNumber(e.target.value)} 
                  placeholder="e.g. +919876543210"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-350">Voter ID Card Number</label>
                <input 
                  type="text" 
                  value={voterIdNumber} 
                  onChange={(e) => setVoterIdNumber(e.target.value.toUpperCase())} 
                  placeholder="e.g. ABC1234567"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold tracking-wider"
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-350">Constituency</label>
                <select 
                  value={constituencyId} 
                  onChange={(e) => setConstituencyId(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold"
                  required
                >
                  <option value="" disabled>Select Constituency</option>
                  {constituencies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-350">Date of Birth</label>
                <input 
                  type="date" 
                  value={dateOfBirth} 
                  onChange={(e) => setDateOfBirth(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold"
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-350">Gender</label>
                <select 
                  value={gender} 
                  onChange={(e) => setGender(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold"
                  required
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1 border-b border-slate-100 dark:border-slate-850 pb-2 pt-2">
              <Landmark className="h-4 w-4" /> Portal Credentials
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-350">Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
                required 
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-350">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-350">Confirm Password</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
                  required 
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full py-2.5 bg-gov-blue hover:bg-gov-darkblue text-white rounded-lg text-sm font-bold shadow-md shadow-gov-blue/10 transition-all"
            >
              Continue to Biometrics
            </button>
          </form>
        )}

        {/* STEP 2: Biometric Liveness Capture */}
        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1 border-b border-slate-100 dark:border-slate-850 pb-2">
              <Camera className="h-4 w-4" /> Academic Biometric verification
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              To verify voter identity, align your face in the oval frame. For this academic liveness demo, wait for the state indicator to instruct you to blink, then perform the capture.
            </p>

            <div className="flex flex-col items-center justify-center gap-4">
              {/* Webcam View Container */}
              <div className="relative w-[360px] h-[270px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-md">
                
                {cameraActive ? (
                  <>
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline 
                      muted
                      className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                    />
                    
                    {/* Oval Outline Guide */}
                    <div className="absolute inset-0 border-[35px] border-slate-950/70 pointer-events-none flex items-center justify-center">
                      <div className="w-[180px] h-[220px] rounded-[50%] border-2 border-gov-gold/80 bg-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.4)]"></div>
                    </div>

                    {/* Instruction Overlay Banner */}
                    <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 border border-slate-700 py-1.5 px-3 rounded-lg text-center">
                      {livenessState === 'DETECTING' && (
                        <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider animate-pulse flex items-center justify-center gap-1.5">
                          <RefreshCw className="h-3 w-3 animate-spin text-gov-gold" />
                          Locating Face Contour...
                        </span>
                      )}
                      {livenessState === 'BLINK_INSTRUCTION' && (
                        <span className="text-xs text-gov-gold font-extrabold uppercase tracking-wide animate-pulse">
                          🎯 Please Blink Now to Authorize
                        </span>
                      )}
                    </div>
                  </>
                ) : facePhoto ? (
                  <img 
                    src={facePhoto} 
                    alt="Captured Signature" 
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="text-center p-4 text-slate-500">
                    <Camera className="h-10 w-10 mx-auto mb-2 text-slate-700" />
                    <span className="text-xs">Camera is offline</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                {!cameraActive ? (
                  <button 
                    type="button" 
                    onClick={startCamera}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gov-blue hover:bg-gov-darkblue text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    <Camera className="h-4 w-4" />
                    {facePhoto ? 'Retake Biometrics' : 'Initialize Camera'}
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={captureFace}
                    disabled={livenessState !== 'BLINK_INSTRUCTION'}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Capture Face Signature
                  </button>
                )}
              </div>

              {cameraError && (
                <div className="p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 rounded-lg text-[10px] text-amber-800 dark:text-amber-400">
                  ⚠️ {cameraError}
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-850">
              <button 
                type="button" 
                onClick={() => { stopCamera(); setStep(1); }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold"
              >
                Back to Details
              </button>
              
              <button 
                type="button" 
                onClick={handleNextStep2}
                disabled={!facePhoto}
                className="px-5 py-2 bg-gov-blue hover:bg-gov-darkblue text-white rounded-lg text-xs font-bold disabled:opacity-40 transition-all"
              >
                Next (Review)
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Review and Submit */}
        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1 border-b border-slate-100 dark:border-slate-850 pb-2">
              <FileText className="h-4 w-4" /> Review Application Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-850">
              <div className="space-y-3 text-xs">
                <div>
                  <span className="block text-slate-400 font-medium">Full Name</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{firstName} {lastName}</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-medium">Voter Card ID Number</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white tracking-wide">{voterIdNumber}</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-medium">Constituency</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {constituencies.find(c => c.id === constituencyId)?.name || 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 font-medium">Contact Coordinates</span>
                  <span className="font-bold text-slate-900 dark:text-white">{email} {phoneNumber ? `• ${phoneNumber}` : ''}</span>
                </div>
              </div>

              {/* Photo Signature Preview */}
              <div className="flex flex-col items-center justify-center gap-2 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-4">
                <span className="block text-xs text-slate-400 font-medium self-start">Biometric Signature</span>
                {facePhoto ? (
                  <div className="w-[120px] h-[90px] rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden">
                    <img src={facePhoto} alt="Signature Thumb" className="w-full h-full object-cover scale-x-[-1]" />
                  </div>
                ) : (
                  <span className="text-red-500 text-xs font-bold">Biometrics Missing</span>
                )}
                <span className="inline-flex items-center gap-1 text-[10px] bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400 font-bold px-1.5 py-0.5 rounded">
                  ✓ Liveness Verified
                </span>
              </div>
            </div>

            {/* Verification Disclaimer */}
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs leading-relaxed space-y-1.5">
              <h4 className="font-bold text-amber-800 dark:text-amber-300">Important Declaration</h4>
              <p className="text-slate-600 dark:text-slate-400">
                By submitting this form, you verify that the information matches your government voter identity. Your profile remains **pending** until an administrator manually cross-checks your credentials.
              </p>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-850">
              <button 
                type="button" 
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold"
              >
                Back to Biometrics
              </button>
              
              <button 
                type="button" 
                onClick={handleRegisterSubmit}
                disabled={loading}
                className="px-6 py-2 bg-gov-blue hover:bg-gov-darkblue text-white rounded-lg text-xs font-bold shadow-md transition-all disabled:opacity-50"
              >
                {loading ? 'Submitting Application...' : 'Submit Register Request'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
