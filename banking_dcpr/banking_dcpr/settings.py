"""
Django settings for banking_dcpr project.
"""

import os
import dj_database_url
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Generate secure secret key for production
# In development, you can set DJANGO_SECRET_KEY environment variable
# For production, ALWAYS set DJANGO_SECRET_KEY environment variable
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    import secrets
    # Generate a secure key if not set (development only)
    SECRET_KEY = secrets.token_urlsafe(50)
    import warnings
    warnings.warn('DJANGO_SECRET_KEY not set in environment. Using generated key. Set DJANGO_SECRET_KEY in production!')

# DEBUG mode: False by default for security, set to True only in development
DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')

# ALLOWED_HOSTS - use environment variable for production
# Local: localhost, 127.0.0.1
# Production: your-app.onrender.com (set in environment variable)
allowed_hosts_env = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1')
ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_env.split(',') if h.strip()]
if DEBUG:
    ALLOWED_HOSTS.extend(["*"])  # Allow all in debug mode

INSTALLED_APPS = [
    # Default Django apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',

    # Your app
    'core',

    # Third-party
    'rest_framework',
    'rest_framework.authtoken',   # ✅ required for authtoken login
    'rest_framework.renderers',     # ✅ for browsable API
    'corsheaders',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # For serving static files in production
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # allow frontend requests
    'django.middleware.common.CommonMiddleware',
    # CSRF disabled for development - re-enable in production
    # 'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# CSRF settings - exempt API endpoints for token authentication
# Token-based APIs don't need CSRF protection
CSRF_EXEMPT_VIEWS = [
    'core.views.obtain_auth_token_with_role',
    'core.views.verify_token', 
    'core.views.logout_user',
    'core.views.create_default_admin',
    'core.views.create_user',
    'core.views.change_password',
    'core.views.user_profile',
    'core.views.audit_log',
    # All API ViewSets are automatically exempt
]

# CORS settings - secure by default, allow specific origins only
# Set CORS_ALLOWED_ORIGINS environment variable (comma-separated)
# Example: CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
_cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS', '')
if _cors_origins:
    # Use specific origins from environment
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(',') if o.strip()]
    CORS_ALLOW_CREDENTIALS = True
elif DEBUG:
    # Development only: allow localhost origins
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ]
    CORS_ALLOW_CREDENTIALS = True
else:
    # Allow Vite dev server by default for development convenience
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ]
    CORS_ALLOW_CREDENTIALS = True

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework.authentication.TokenAuthentication",  # ✅ authtoken only
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

ROOT_URLCONF = 'banking_dcpr.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'banking_dcpr.wsgi.application'

# Database configuration
# Production: Use DATABASE_URL from environment (PostgreSQL from ElephantSQL/Render)
# Local: Use SQLite
if 'DATABASE_URL' in os.environ:
    DATABASES = {
        'default': dj_database_url.parse(os.environ.get('DATABASE_URL'))
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'  # Collect static files here for production

STATICFILES_DIRS = [
    BASE_DIR / "static",
    BASE_DIR / "frontend_admin" / "dist",  # adjust path to your frontend build
]

# Whitenoise configuration for serving static files in production
if not DEBUG:
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Email Report Settings
EMAIL_REPORT_ENABLED = False  # Set to True to enable email reports
EMAIL_REPORT_RECIPIENTS = []   # List of email addresses
EMAIL_REPORT_FREQUENCY = 'daily'  # daily, weekly, monthly
EMAIL_REPORT_INCLUDE_CASH_IN_BANK = True
EMAIL_REPORT_INCLUDE_PCF = True
EMAIL_REPORT_INCLUDE_PDC = True

# Email Configuration (for sending reports)
# EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
# EMAIL_HOST = 'smtp.example.com'
# EMAIL_PORT = 587
# EMAIL_USE_TLS = True
# EMAIL_HOST_USER = 'reports@example.com'
# EMAIL_HOST_PASSWORD = 'your-password-here'
# DEFAULT_FROM_EMAIL = 'JOPCA DCPR <reports@example.com>'
