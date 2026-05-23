@echo off
echo ============================================
echo  Starting Django Server (Terminal 3)
echo ============================================
echo.
set PYTHONIOENCODING=utf-8

.\venv\Scripts\python.exe manage.py runserver 8000
