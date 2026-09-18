import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { googleLogin } from '../../api/auth';

export default function GoogleAuthButton({ disabled = false, text = "Sign in with Google" }) {
  const navigate = useNavigate();
  const buttonRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [gisLoaded, setGisLoaded] = useState(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '988463628659-tg8pt7db550gmtg8avat0hm94lk0kaml.apps.googleusercontent.com';

  const initializedRef = useRef(false);
  const handleCredentialResponseRef = useRef();

  const handleCredentialResponse = async (response) => {
    if (!response || !response.credential) {
      setErrorMsg('No credential returned from Google.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await googleLogin(response.credential);
      // Route through pre-auth -> OTP stub (Module 5 handoff)
      navigate('/verify-otp', {
        state: {
          email: res.destination?.masked_email || '',
          preAuthToken: res.pre_auth_token,
          destination: res.destination,
          authMethod: 'google_oauth',
        },
      });
    } catch (err) {
      if (err.code === 'ACCOUNT_CONFLICT') {
        setErrorMsg('This email is already linked to a different Google account. Please contact Election Commission support.');
      } else if (err.code === 'ACCOUNT_SUSPENDED') {
        setErrorMsg('This account has been suspended. Please contact Election Commission support.');
      } else {
        setErrorMsg(err.message || 'Google authentication could not be completed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  handleCredentialResponseRef.current = handleCredentialResponse;

  useEffect(() => {
    // Check if Google Identity Services script is already present or loaded
    if (window.google?.accounts?.id) {
      setGisLoaded(true);
      return;
    }

    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          setGisLoaded(true);
        }
      }, 100);
      const timeout = setTimeout(() => clearInterval(interval), 10000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGisLoaded(true);
    script.onerror = () => setErrorMsg('Failed to load Google Sign-In SDK.');
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (gisLoaded && window.google?.accounts?.id && buttonRef.current) {
      try {
        if (!initializedRef.current) {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (res) => handleCredentialResponseRef.current?.(res),
            auto_select: false,
            cancel_on_tap_outside: true,
          });
          initializedRef.current = true;
        }

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: text.includes('Register') ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: buttonRef.current.offsetWidth || 340,
        });
      } catch (e) {
        console.error('Error rendering Google button:', e);
      }
    }
  }, [gisLoaded, googleClientId, text]);

  // Fallback trigger if button click simulated
  const handleManualClick = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
  };

  return (
    <div className="w-full space-y-2">
      {errorMsg && (
        <div role="alert" className="p-2.5 bg-red-50 border-l-4 border-red-600 text-red-800 text-xs rounded-r flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded border border-slate-300 bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs">
          <Loader2 className="w-4 h-4 animate-spin text-[#0d2847]" />
          <span>Verifying Google Identity with ECI Sovereign Gateway...</span>
        </div>
      ) : (
        <div className="w-full flex justify-center">
          {/* Official Google GIS Render Container */}
          <div ref={buttonRef} className={`w-full flex justify-center ${disabled ? 'opacity-50 pointer-events-none' : ''}`} />
        </div>
      )}
    </div>
  );
}
