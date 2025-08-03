@echo off
echo 🔄 Committing and pushing changes...

echo 📁 Adding changes...
git add robust-data-collection.js

echo 💾 Committing changes...
git commit -m "Fix CSV Export selector - change from text/ to :has-text()"

echo 🚀 Pushing to GitHub...
git push origin master

echo ✅ Changes pushed successfully!
pause 