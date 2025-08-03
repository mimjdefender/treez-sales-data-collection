const { execSync } = require('child_process');

console.log('🔄 Committing and pushing all changes...');

try {
  // Add all changes
  console.log('📁 Adding all changes...');
  execSync('git add .', { stdio: 'pipe' });
  
  // Commit changes
  console.log('💾 Committing changes...');
  execSync('git commit -m "Fix CSV Export selectors and add debug files"', { stdio: 'pipe' });
  
  // Push to GitHub
  console.log('🚀 Pushing to GitHub...');
  execSync('git push origin master', { stdio: 'pipe' });
  
  console.log('✅ All changes pushed successfully!');
} catch (error) {
  console.error('❌ Error:', error.message);
} 