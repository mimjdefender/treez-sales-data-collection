// Simple test to isolate the extraction logic
const testData = [
  { text: "235Tickets", expected: null },
  { text: "1,230.06Quantity", expected: null },
  { text: "$8,790.96Gross Sales", expected: null },
  { text: "$1,386.44Discounts", expected: null },
  { text: "$0.00Returns", expected: null },
  { text: "$7,404.52Net Sales", expected: "$7,404.52" },
  { text: "$1,210.03Taxes", expected: null },
  { text: "$8,614.55Gross Receipts", expected: null },
  { text: "$3,101.94Cost", expected: null }
];

function testExtractionLogic() {
  console.log(`🔍 Testing extraction logic with sample data...`);
  
  for (let i = 0; i < testData.length; i++) {
    const item = testData[i];
    console.log(`\nItem ${i + 1}: "${item.text}"`);
    
    if (item.text && item.text.includes('Net Sales')) {
      console.log(`Found Net Sales in item ${i + 1}`);
      
      // Extract the dollar amount from the full text using regex
      const match = item.text.match(/\$([\d,]+\.\d+)/);
      if (match) {
        console.log('Regex match found:', match[0]);
        const result = match[0];
        console.log(`✅ Extracted: "${result}"`);
        
        if (result === item.expected) {
          console.log('✅ CORRECT - Expected result matches!');
        } else {
          console.log(`❌ INCORRECT - Expected "${item.expected}" but got "${result}"`);
        }
        
        return result;
      } else {
        console.log('No regex match found');
      }
    }
  }
  
  console.log('❌ No Net Sales item found');
  return null;
}

const result = testExtractionLogic();
console.log(`\n📊 Final extraction result: "${result}"`);

// Test the parsing logic
if (result) {
  const match = result.match(/\$([\d,]+\.\d+)/);
  if (match) {
    const cleanNumber = match[1].replace(/,/g, '');
    const salesAmount = parseFloat(cleanNumber);
    console.log(`✅ Parsed amount: $${salesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    
    if (salesAmount > 0) {
      console.log('✅ SUCCESS - Found correct sales data!');
    } else {
      console.log('❌ FAILED - Still getting zero');
    }
  } else {
    console.log(`❌ No regex match found in: "${result}"`);
  }
} 