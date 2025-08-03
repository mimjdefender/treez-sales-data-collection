const { execSync } = require('child_process');

console.log('🔄 Pushing changes to GitHub...');

try {
  // Check if there are changes to commit
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  
  if (status.trim()) {
    console.log('📁 Changes detected, committing...');
    execSync('git add robust-data-collection.js', { stdio: 'pipe' });
    execSync('git commit -m "Fix CSV Export selector - change from text/ to :has-text()"', { stdio: 'pipe' });
    console.log('💾 Changes committed');
  } else {
    console.log('📁 No changes to commit');
  }
  
  // Push to GitHub
  console.log('🚀 Pushing to GitHub...');
  execSync('git push origin master', { stdio: 'pipe' });
  console.log('✅ Changes pushed successfully!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
} 