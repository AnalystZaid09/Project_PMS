@echo off
title Apex Health Diagnostics PMS - Launcher
color 0A

echo ======================================================================
echo          APEX HEALTH DIAGNOSTICS - PATIENT MANAGEMENT SYSTEM (PMS)
echo                        ONE-CLICK CLIENT LAUNCHER
echo ======================================================================
echo.
echo Starting Backend API and Frontend Web Application...
echo.

:: 1. Launch Backend in a separate window
echo [1/3] Launching Backend Server (FastAPI on Port 8000)...
start "Apex PMS Backend API [Port 8000]" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

:: 2. Launch Frontend in a separate window
echo [2/3] Launching Frontend Application (Vite on Port 3000)...
start "Apex PMS Frontend Web [Port 3000]" cmd /k "cd /d %~dp0frontend && npm run dev"

:: 3. Wait for servers to spin up
echo [3/3] Waiting for services to initialize...
timeout /t 4 /nobreak > nul

:: 4. Launch Default Web Browser
echo Opening application in your browser...
start http://localhost:3000

echo.
echo ======================================================================
echo              APEX PMS IS NOW RUNNING SUCCESSFULLY!
echo ======================================================================
echo.
echo  - Frontend Web UI:  http://localhost:3000
echo  - Backend API Docs: http://localhost:8000/docs
echo.
echo  CLIENT LOGIN CREDENTIALS:
echo  ------------------------------------------------------------------
echo   Username: superadmin
echo   Password: Admin@123
echo  ------------------------------------------------------------------
echo.
echo  Please refer to 'PMS_Admin_Employee_End_to_End_Testing_Guide.docx'
echo  for complete click-by-click testing walkthrough.
echo.
echo  To shut down the application, simply close the two opened server windows.
echo ======================================================================
pause
