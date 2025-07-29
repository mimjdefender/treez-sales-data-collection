/**
 * Google Apps Script for Sales Data Processing
 * This script can be used to process and analyze the collected sales data
 */

// Configuration
const FOLDER_NAME = 'MedsCafeReports';
const STORES = ['cheboygan', 'lowell', 'alpena', 'gaylord', 'rc', 'manistee'];

/**
 * Main function to process sales data
 */
function processSalesData() {
  try {
    const folder = getOrCreateFolder(FOLDER_NAME);
    const today = new Date().toISOString().split('T')[0];
    
    // Process each store's data
    STORES.forEach(storeName => {
      processStoreData(folder, storeName, today);
    });
    
    // Create summary report
    createSummaryReport(folder, today);
    
    Logger.log('Sales data processing completed successfully');
  } catch (error) {
    Logger.log('Error processing sales data: ' + error.toString());
  }
}

/**
 * Process data for a specific store
 */
function processStoreData(folder, storeName, date) {
  try {
    // Find the CSV file for this store and date
    const fileName = `${storeName}-${date}.csv`;
    const files = folder.getFilesByName(fileName);
    
    if (files.hasNext()) {
      const file = files.next();
      const csvContent = file.getBlob().getDataAsString();
      
      // Parse CSV and create a Google Sheet
      const sheet = createStoreSheet(storeName, date);
      parseCSVToSheet(csvContent, sheet);
      
      Logger.log(`Processed data for ${storeName}`);
    } else {
      Logger.log(`No data file found for ${storeName} on ${date}`);
    }
  } catch (error) {
    Logger.log(`Error processing ${storeName}: ${error.toString()}`);
  }
}

/**
 * Create a Google Sheet for store data
 */
function createStoreSheet(storeName, date) {
  const spreadsheetName = `${storeName}_Sales_${date}`;
  const spreadsheet = SpreadsheetApp.create(spreadsheetName);
  
  // Add some basic formatting
  const sheet = spreadsheet.getActiveSheet();
  sheet.getRange(1, 1, 1, 10).setBackground('#4285f4').setFontColor('white').setFontWeight('bold');
  
  return sheet;
}

/**
 * Parse CSV content and add to sheet
 */
function parseCSVToSheet(csvContent, sheet) {
  const rows = Utilities.parseCsv(csvContent);
  
  if (rows.length > 0) {
    // Add headers
    sheet.getRange(1, 1, 1, rows[0].length).setValues([rows[0]]);
    
    // Add data
    if (rows.length > 1) {
      sheet.getRange(2, 1, rows.length - 1, rows[0].length).setValues(rows.slice(1));
    }
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, rows[0].length);
  }
}

/**
 * Create a summary report
 */
function createSummaryReport(folder, date) {
  const spreadsheetName = `Sales_Summary_${date}`;
  const spreadsheet = SpreadsheetApp.create(spreadsheetName);
  const sheet = spreadsheet.getActiveSheet();
  
  // Add summary headers
  sheet.getRange('A1:D1').setValues([['Store', 'Data Collected', 'Timestamp', 'Status']]);
  sheet.getRange('A1:D1').setBackground('#34a853').setFontColor('white').setFontWeight('bold');
  
  // Check each store's data
  let row = 2;
  STORES.forEach(storeName => {
    const fileName = `${storeName}-${date}.csv`;
    const files = folder.getFilesByName(fileName);
    const hasData = files.hasNext();
    
    sheet.getRange(row, 1, 1, 4).setValues([[
      storeName,
      hasData ? 'Yes' : 'No',
      new Date().toISOString(),
      hasData ? '✅' : '❌'
    ]]);
    
    row++;
  });
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, 4);
}

/**
 * Get or create a folder in Google Drive
 */
function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(folderName);
  }
}

/**
 * Set up daily trigger for data processing
 */
function setupDailyTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'processSalesData') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger to run at 4:30 PM and 9:25 PM EST
  // (30 minutes after data collection to allow for processing time)
  ScriptApp.newTrigger('processSalesData')
    .timeBased()
    .everyDays(1)
    .atHour(21) // 9:30 PM UTC (4:30 PM EST)
    .create();
    
  ScriptApp.newTrigger('processSalesData')
    .timeBased()
    .everyDays(1)
    .atHour(2) // 2:25 AM UTC (9:25 PM EST previous day)
    .create();
}

/**
 * Manual trigger function for testing
 */
function manualProcess() {
  processSalesData();
} 