Write-Host "🔄 Committing and pushing changes..." -ForegroundColor Green

try {
    # Add all changes
    Write-Host "📁 Adding changes..." -ForegroundColor Yellow
    git add .
    
    # Commit changes
    Write-Host "💾 Committing changes..." -ForegroundColor Yellow
    git commit -m "Fix CSV Export selector - change from text/ to :has-text()"
    
    # Push to GitHub
    Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Yellow
    git push origin master
    
    Write-Host "✅ Changes pushed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error pushing changes: $($_.Exception.Message)" -ForegroundColor Red
} 