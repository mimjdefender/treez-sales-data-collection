@echo off
echo 🔄 Pushing changes to GitHub...

echo 📁 Adding changes...
git add .

echo 💾 Committing changes...
git commit -m "Update workflow: fix cron schedule and add error resilience"

echo 🚀 Pushing to GitHub...
git push origin master

echo ✅ Changes pushed successfully!
pause 