@echo off
echo === OuiMoove Vercel Deploy ===
cd /d "%~dp0"

where vercel >nul 2>&1
if %errorlevel% neq 0 (
  echo Installing Vercel CLI...
  npm install -g vercel
)

echo.
echo Deploying to production...
vercel --prod
pause
