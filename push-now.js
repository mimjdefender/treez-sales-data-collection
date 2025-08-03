const { execSync } = require('child_process');

console.log('🔄 Pushing workflow changes...');

try {
  // Add all changes
  execSync('git add .', { stdio: 'pipe' });
  console.log('✅ Added changes');
  
  // Commit changes
  execSync('git commit -m "Update workflow: fix cron schedule and add error resilience"', { stdio: 'pipe' });
  console.log('✅ Committed changes');
  
  // Push to GitHub
  execSync('git push origin master', { stdio: 'pipe' });
  console.log('✅ Pushed to GitHub');
  
  console.log('🎉 All changes pushed successfully!');
} catch (error) {
  console.error('❌ Error:', error.message);
} 