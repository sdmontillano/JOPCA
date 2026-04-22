@echo off
echo Starting JOPCA Django Backend Server...
cd /d "c:\Users\DELL\Desktop\JOPCA\banking_dcpr"
echo Current directory: %CD%
echo.
echo Starting Django development server on http://127.0.0.1:8000
echo Press Ctrl+C to stop the server
echo.
python manage.py runserver
pause
