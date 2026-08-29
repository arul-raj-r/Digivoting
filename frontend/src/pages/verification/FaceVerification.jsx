import { useState, useEffect, useRef } from 'react';
import { Camera, ShieldCheck, RefreshCw, HelpCircle } from 'lucide-react';
import VerificationLayout from '../../layouts/VerificationLayout';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import ProgressBar from '../../components/common/ProgressBar';
import { verificationService } from '../../services/verificationService';

export default function FaceVerification() {
  const [stream, setStream] = useState(null);
  const [cameraStatus, setCameraStatus] = useState('not-started'); // 'not-started' | 'granted' | 'denied'
  const [livenessStep, setLivenessStep] = useState(0); // 0: Position face, 1: Blink, 2: Analyzing
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const videoRef = useRef(null);

  const steps = [
    { title: 'Camera Access', description: 'Enable browser webcam access.' },
    { title: 'Liveness Diagnostics', description: 'Complete face liveness checks.' },
  ];

  // Request camera access
  const startCamera = async () => {
    setErrorMsg('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      setStream(mediaStream);
      setCameraStatus('granted');
      setLivenessStep(0);
    } catch (e) {
      setCameraStatus('denied');
      setErrorMsg('Webcam permission was declined or camera device is occupied.');
    }
  };

  useEffect(() => {
    if (cameraStatus === 'granted' && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [cameraStatus, stream]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Liveness check simulation for visual design (but actual submission calls API)
  useEffect(() => {
    let timer;
    if (cameraStatus === 'granted' && livenessStep === 0) {
      // Prompt user to blink in 3 seconds
      timer = setTimeout(() => {
        setLivenessStep(1);
        setProgress(30);
      }, 3000);
    } else if (cameraStatus === 'granted' && livenessStep === 1) {
      // Start analyzing
      timer = setTimeout(() => {
        setLivenessStep(2);
        setProgress(60);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [cameraStatus, livenessStep]);

  // Trigger analysis call to Django API
  const handleLivenessSubmit = async () => {
    setProgress(80);
    setErrorMsg('');
    try {
      // Try sending stream capture to verification service
      await verificationService.verifyFace(stream);
      setProgress(100);
    } catch (e) {
      setErrorMsg('Face verification validation failed on the backend. Verification endpoints are currently offline.');
      setProgress(0);
      setLivenessStep(0);
    }
  };

  return (
    <VerificationLayout currentStep={cameraStatus === 'granted' ? 2 : 1} steps={steps}>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Camera className="h-6 w-6 text-gov-blue dark:text-gov-slate" />
          <h2 className="text-xl font-bold">Face Verification</h2>
        </div>

        {errorMsg && <Alert type="warning" title="Verification Interrupt">{errorMsg}</Alert>}

        {cameraStatus !== 'granted' ? (
          <div className="space-y-6 py-6 text-center">
            <div className="h-44 max-w-sm mx-auto bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700">
              <Camera className="h-12 w-12 text-slate-405" />
            </div>
            
            <div className="space-y-2 max-w-sm mx-auto">
              <h3 className="font-bold text-sm">Webcam Access Request</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This verification steps matches your face features against Voter ID records. Allow camera access in your browser pop-up.
              </p>
            </div>

            <Button variant="primary" onClick={startCamera}>
              Request Camera Permission
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Camera Preview Area */}
            <div className="relative h-64 max-w-md mx-auto rounded-xl overflow-hidden bg-slate-905 bg-slate-900 border border-slate-750">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover transform -scale-x-100"
              />
              
              {/* Circular Guide Overlay */}
              <div className="absolute inset-0 border-[16px] border-slate-900/60 flex items-center justify-center">
                <div className="h-44 w-44 rounded-full border-2 border-dashed border-gov-gold/70 animate-pulse"></div>
              </div>

              {/* Step indicator tag */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-900/80 text-white px-3 py-1 rounded text-[10px] font-semibold tracking-wide">
                {livenessStep === 0 && 'POSITION YOUR FACE'}
                {livenessStep === 1 && 'ACTION REQUIRED: BLINK TWICE'}
                {livenessStep === 2 && 'ANALYSIS READY'}
              </div>
            </div>

            {/* Instruction details */}
            <div className="space-y-4 max-w-md mx-auto text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-lg space-y-2 border border-slate-100 dark:border-slate-800">
                <h5 className="font-bold text-slate-700 dark:text-slate-350">Liveness Instructions:</h5>
                <ul className="list-disc pl-5 space-y-1 text-slate-500">
                  <li>Keep face in center frame.</li>
                  <li>Ensure background lighting is consistent (no strong backlights).</li>
                  <li>Follow prompt to blink.</li>
                </ul>
              </div>

              {livenessStep >= 1 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                    <span>Liveness Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <ProgressBar value={progress} />
                </div>
              )}

              {livenessStep === 2 && (
                <Button variant="primary" className="w-full" onClick={handleLivenessSubmit}>
                  Submit Liveness Capture
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </VerificationLayout>
  );
}
