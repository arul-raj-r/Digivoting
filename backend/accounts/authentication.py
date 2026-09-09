from datetime import timedelta
from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from authentication.models import UserSession


class SessionJWTAuthentication(JWTAuthentication):
    """
    Custom DRF authentication class for DigiVote (Module 6).
    - Extends SimpleJWT's JWTAuthentication.
    - Validates JWT signature.
    - Extracts `session_id` claim from token.
    - Verifies that the corresponding UserSession is:
      1. NOT revoked (`revoked == False`)
      2. NOT expired (`expires_at > timezone.now()`)
    - Rejects request with 401 AuthenticationFailed if session is revoked/expired.
    - Throttles update of `last_active_at` (updates at most once every 5 minutes).
    - Attaches `request.user_session = session`.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)

        # Check session_id claim
        session_id = validated_token.get('session_id')
        if session_id:
            try:
                session = UserSession.objects.filter(id=session_id, user=user).first()
                if not session:
                    raise AuthenticationFailed("Session not found or belongs to another user.", code="SESSION_NOT_FOUND")

                if session.revoked:
                    raise AuthenticationFailed("Your session has been logged out or revoked. Please sign in again.", code="SESSION_REVOKED")

                now = timezone.now()
                if session.expires_at < now:
                    raise AuthenticationFailed("Session has expired. Please sign in again.", code="SESSION_EXPIRED")

                # Throttle last_active_at update (only update if > 5 minutes since last active)
                if (now - session.last_active_at).total_seconds() > 300:
                    UserSession.objects.filter(id=session.id).update(last_active_at=now)

                request.user_session = session

            except (AuthenticationFailed, InvalidToken):
                raise
            except Exception as e:
                raise AuthenticationFailed(f"Session validation error: {str(e)}", code="SESSION_ERROR")
        else:
            request.user_session = None

        return (user, validated_token)
