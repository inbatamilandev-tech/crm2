@echo off
echo ============================================
echo  Starting Celery Worker (Terminal 2)
echo ============================================
echo.
echo  Connected to: redis://localhost:6379/0
echo  Pool: solo (Windows-safe)
echo.
set PYTHONIOENCODING=utf-8
set DJANGO_SETTINGS_MODULE=crm_backend.settings
set FORKED_BY_MULTIPROCESSING=1

.\venv\Scripts\python.exe -m celery -A crm_backend worker ^
    --loglevel=info ^
    --pool=solo ^
    --without-gossip ^
    --without-mingle ^
    --without-heartbeat
