@echo off
echo.
echo ====================================================
echo Starting Deployment...
echo ====================================================
echo.
git add .
git commit -m "feat: add visual animations, enhance design system, and update deployment files"
git push
echo.
echo ====================================================
echo SUCCESS: Changes pushed to GitHub!
echo Netlify will redeploy your app automatically.
echo ====================================================
echo.
pause
