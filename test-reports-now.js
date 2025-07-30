const SalesReporter = require('./reporting');

async function testReportsNow() {
  try {
    console.log('🧪 Testing reports generation...');
    
    const reporter = new SalesReporter();
    
    // Force 4:20 PM report
    console.log('\n📊 Generating 4:20 PM report...');
    await reporter.run420Report();
    
    // Force 9:15 PM report
    console.log('\n📊 Generating 9:15 PM final report...');
    await reporter.run915Report();
    
    console.log('\n✅ Both reports generated successfully!');
    console.log('📱 Check your Google Chat for the messages!');
    
  } catch (error) {
    console.error('❌ Report generation failed:', error.message);
  }
}

testReportsNow(); 