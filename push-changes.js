const { execSync } = require('child_process');

console.log('🔄 Committing and pushing changes...');

try {
  // Add all changes
  console.log('📁 Adding changes...');
  execSync('git add .', { stdio: 'inherit' });
  
  // Commit changes
  console.log('💾 Committing changes...');
  execSync('git commit -m "Fix CSV Export selector - change from text/ to :has-text()"', { stdio: 'inherit' });
  
  // Push to GitHub
  console.log('🚀 Pushing to GitHub...');
  execSync('git push origin master', { stdio: 'inherit' });
  
  console.log('✅ Changes pushed successfully!');
} catch (error) {
  console.error('❌ Error pushing changes:', error.message);
} 