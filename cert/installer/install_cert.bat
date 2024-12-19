@echo off

REM Check if the certificate path argument is provided
if "%~1"=="" (
    echo Usage: %~nx0 ^<cert_path^>
    exit /b 1
)

REM Store the certificate path from the argument
set CERT_PATH=%~1

REM Check if running with administrative privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :run
) else (
    echo Requesting administrative privileges...
    powershell -Command "Start-Process cmd -Verb RunAs -ArgumentList '/c %~dpnx0 \"%CERT_PATH%\"'"
    exit /b
)

:run
echo Running with administrative privileges...

REM Add the certificate to Trusted Root Certification Authorities
certutil -addstore -f "Root" "%CERT_PATH%"

if %errorLevel% == 0 (
    echo Certificate added successfully!
) else (
    echo Failed to add certificate.
)

pause
