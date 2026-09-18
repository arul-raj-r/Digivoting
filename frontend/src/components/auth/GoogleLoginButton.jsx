import { useEffect, useRef, useState } from 'react';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  import.meta.env.GOOGLE_CLIENT_ID ||
  '988463628659-tg8pt7db550gmtg8avat0hm94lk0kaml.apps.googleusercontent.com';

export default function GoogleLoginButton({
  onSuccess,
  onError,
  isLoading: externalLoading = false,
  disabled = false,
  className = '',
}) {
  const [gsiReady, setGsiReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const buttonContainerRef = useRef(null);

  const callbacksRef = useRef({ onSuccess, onError });
  useEffect(() => {
    callbacksRef.current = { onSuccess, onError };
  }, [onSuccess, onError]);

  const initializedRef = useRef(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('[GoogleLoginButton] VITE_GOOGLE_CLIENT_ID is not configured.');
      return;
    }

    const initGsi = () => {
      if (window.google?.accounts?.id) {
        if (!initializedRef.current) {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response) => {
              setIsLoading(false);
              if (response?.credential) {
                callbacksRef.current.onSuccess?.(response.credential);
              } else {
                callbacksRef.current.onError?.('No credential received from Google.');
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });
          initializedRef.current = true;
        }

        // Render official GIS button into the overlay container
        if (buttonContainerRef.current) {
          try {
            window.google.accounts.id.renderButton(buttonContainerRef.current, {
              theme: 'outline',
              size: 'large',
              type: 'standard',
              shape: 'rectangular',
              text: 'continue_with',
              logo_alignment: 'left',
              width: buttonContainerRef.current.offsetWidth || 340,
            });
          } catch (err) {
            console.warn('[GoogleLoginButton] Failed to render Google button:', err);
          }
        }

        setGsiReady(true);
      }
    };

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGsi();
        }
      }, 100);

      const timeout = setTimeout(() => clearInterval(interval), 10000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, []);

  const handleClick = () => {
    if (!gsiReady || !window.google?.accounts?.id) {
      onError?.('Google Sign-In service is initializing. Please try again.');
      return;
    }

    setIsLoading(true);

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed()) {
        setIsLoading(false);
        const reason = notification.getNotDisplayedReason();
        console.warn(`[GoogleLoginButton] One Tap not displayed: ${reason}`);
      } else if (notification.isSkippedMoment()) {
        setIsLoading(false);
      }
    });
  };

  const combinedLoading = isLoading || externalLoading;
  const isDisabled = disabled || combinedLoading || !GOOGLE_CLIENT_ID;

  return (
    <div className="relative w-full overflow-hidden rounded">
      {/* Visual Custom Button */}
      <button
        type="button"
        disabled={isDisabled}
        onClick={handleClick}
        className={`w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.62-.62-1.09-1.37-1.21-2.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span>{combinedLoading ? 'Connecting to Google...' : 'Continue with Google Account'}</span>
      </button>

      {/* Official Google GIS Button transparently overlaid so clicks trigger Google account picker directly */}
      <div
        ref={buttonContainerRef}
        className={`absolute inset-0 opacity-[0.001] cursor-pointer overflow-hidden flex items-center justify-center ${
          isDisabled ? 'pointer-events-none' : 'pointer-events-auto'
        }`}
        title="Sign in with Google"
      />
    </div>
  );
}
