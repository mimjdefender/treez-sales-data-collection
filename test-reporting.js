const SalesReporter = require('./reporting');

async function testReporting() {
  try {
    console.log('🧪 Testing reporting system...');
    
    const reporter = new SalesReporter();
    
    // Test 4:20 PM report
    console.log('\n📊 Testing 4:20 PM report...');
    await reporter.run420Report();
    
    // Test 9:15 PM report
    console.log('\n📊 Testing 9:15 PM report...');
    await reporter.run915Report();
    
    console.log('\n✅ Reporting system test completed!');
    
  } catch (error) {
    console.error('❌ Reporting test failed:', error.message);
  }
}

testReporting(); 