import os
import sys
from pathlib import Path
from datetime import timedelta
import environ
import dj_database_url
from django.core.exceptions import ImproperlyConfigured

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Initialize environment loader
env = environ.Env(
    DEBUG=(bool, False)
)

# Load env configurations
env_file = BASE_DIR / '.env'
if env_file.exists():
    environ.Env.read_env(str(env_file))

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env('SECRET_KEY', default='')
if not SECRET_KEY:
    if env('DEBUG', default='True').lower() == 'true':
        SECRET_KEY = 'django-insecure-t(d^98mvl)keszoh0_j@)(%23s@36hbf61ph=9u=9dzo6kr28b'
    else:
        raise ImproperlyConfigured("SECRET_KEY environment variable is required in production.")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env.bool('DEBUG', default=False)

ALLOWED_HOSTS = [h.strip() for h in env('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',') if h.strip()]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    
    # Project modular apps
    'accounts.apps.AccountsConfig',
    'authentication.apps.AuthenticationConfig',
    'voters.apps.VotersConfig',
    'locations.apps.LocationsConfig',
    'elections.apps.ElectionsConfig',
    'candidates.apps.CandidatesConfig',
    'voting.apps.VotingConfig',
    'security.apps.SecurityConfig',
    'audit.apps.AuditConfig',
    'notifications.apps.NotificationsConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database configuration
db_url = env('DATABASE_URL', default=None)

if 'test' in sys.argv:
    db_url = env('TEST_DATABASE_URL', default='sqlite:///:memory:')

if not db_url:
    raise ImproperlyConfigured("DATABASE_URL environment variable is required and must not be empty.")

# When connecting through Supabase transaction pooler (pgbouncer on port 6543 or pooler.supabase.com),
# persistent connections (conn_max_age > 0) cause "server closed the connection unexpectedly"
# and server-side cursors are not supported by pgbouncer in transaction mode.
is_pooler = 'pooler.supabase.com' in db_url or ':6543' in db_url
default_conn_max_age = 0 if is_pooler else 600
conn_max_age = env.int('DB_CONN_MAX_AGE', default=default_conn_max_age)

DATABASES = {
    'default': dj_database_url.parse(
        db_url,
        conn_max_age=conn_max_age,
    )
}

if is_pooler or 'postgresql' in DATABASES['default'].get('ENGINE', ''):
    DATABASES['default']['DISABLE_SERVER_SIDE_CURSORS'] = True

if 'sqlite' in DATABASES['default']['ENGINE']:
    DATABASES['default'].setdefault('OPTIONS', {})['timeout'] = 30

# Custom User Model
AUTH_USER_MODEL = 'authentication.User'

# Password validation & Secure Hashing (Module 7: Argon2 preferred)
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static & Media Storage Configuration (Module 9 Storage Abstraction)
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

USE_S3 = env.bool('USE_S3', default=False)

if USE_S3:
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
            "OPTIONS": {
                "bucket_name": env('AWS_STORAGE_BUCKET_NAME', default=''),
                "region_name": env('AWS_S3_REGION_NAME', default='ap-south-1'),
                "endpoint_url": env('AWS_S3_ENDPOINT_URL', default=None),
            },
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
else:
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }

# CORS & CSRF Configuration
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [o.strip() for o in env('CORS_ALLOWED_ORIGINS', default='http://localhost:5173').split(',') if o.strip()]
CSRF_TRUSTED_ORIGINS = [o.strip() for o in env('CSRF_TRUSTED_ORIGINS', default='http://localhost:5173').split(',') if o.strip()]
CORS_ALLOW_CREDENTIALS = True

# Security settings
if not DEBUG:
    SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=True)
    SESSION_COOKIE_SECURE = env.bool('SESSION_COOKIE_SECURE', default=True)
    CSRF_COOKIE_SECURE = env.bool('CSRF_COOKIE_SECURE', default=True)
    SECURE_HSTS_SECONDS = env.int('SECURE_HSTS_SECONDS', default=31536000)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
else:
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False
    SECURE_HSTS_SECONDS = 0

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'accounts.authentication.SessionJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
    ),
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '200/day',
        'user': '2000/day',
        'login': '15/minute',
        'otp': '5/minute',
        'vote': '10/minute',
    }
}

# Swagger UI Documentation
SPECTACULAR_SETTINGS = {
    'TITLE': 'DigiVote API Documentation',
    'DESCRIPTION': 'Core secure REST API routes for identity, location context, verification logs, and audit logs.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# SimpleJWT configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# Email Backend
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Demo mode configuration
DEMO_MODE = env.bool('DEMO_MODE', default=True)

AUTHENTICATION_BACKENDS = [
    'authentication.backends.EmailOrUsernameBackend',
]

# Email configurations
EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='').strip()
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='').replace(' ', '').strip()
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default=EMAIL_HOST_USER or 'noreply@digivote.org')

# Google OAuth settings
GOOGLE_CLIENT_ID = env('GOOGLE_CLIENT_ID', default='')
GOOGLE_CLIENT_SECRET = env('GOOGLE_CLIENT_SECRET', default='')

# Frontend URL (for email verification/reset links)
FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:5173')

# OTP and Verification Constraints (Modules 4 & 5)
OTP_EXPIRY_SECONDS = env.int('OTP_EXPIRY_SECONDS', default=300) # 5 minutes
OTP_RESEND_COOLDOWN_SECONDS = env.int('OTP_RESEND_COOLDOWN_SECONDS', default=30)
OTP_MAX_ATTEMPTS = env.int('OTP_MAX_ATTEMPTS', default=3)
EMAIL_VERIFICATION_EXPIRY_HOURS = env.int('EMAIL_VERIFICATION_EXPIRY_HOURS', default=24)
PASSWORD_RESET_EXPIRY_MINUTES = env.int('PASSWORD_RESET_EXPIRY_MINUTES', default=60)

