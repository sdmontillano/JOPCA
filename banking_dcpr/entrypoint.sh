#!/bin/bash
set -e

echo "Running migrations..."
cd banking_dcpr
python manage.py migrate --noinput
python manage.py create_default_user
echo "Starting Gunicorn..."
exec gunicorn banking_dcpr.wsgi --bind 0.0.0.0:$PORT
