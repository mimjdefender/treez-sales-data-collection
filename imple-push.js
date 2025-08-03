[1mdiff --git a/robust-data-collection-csv.js b/robust-data-collection-csv.js[m
[1mindex c4d468c..6aebc41 100644[m
[1m--- a/robust-data-collection-csv.js[m
[1m+++ b/robust-data-collection-csv.js[m
[36m@@ -162,12 +162,30 @@[m [masync function getStoreDataViaCSV(store, targetDate) {[m
     // Wait for date to be set[m
     await page.waitForTimeout(2000);[m
     [m
[31m-    console.log(`📊 Generating CSV report...`);[m
[32m+[m[32m    console.log(`📊 Step 1: Clicking "Generate Report"...`);[m
     [m
[31m-    // Click the generate report button[m
[32m+[m[32m    // Step 1: Click the generate report button[m
     await page.click('button:has-text("Generate Report")');[m
     [m
[32m+[m[32m    // Wait for the report to generate[m
[32m+[m[32m    console.log(`⏳ Waiting for report to generate...`);[m
[32m+[m[32m    await page.waitForTimeout(5000);[m
[32m+[m[41m    [m
[32m+[m[32m    console.log(`📊 Step 2: Looking for dropdown menu...`);[m
[32m+[m[41m    [m
[32m+[m[32m    // Step 2: Find and click the dropdown menu (the one with "Print Window" text)[m
[32m+[m[32m    const dropdownButton = await page.waitForSelector('.ui.scrolling.dropdown.icon', { timeout: 10000 });[m
[32m+[m[32m    await dropdownButton.click();[m
[32m+[m[41m    [m
[32m+[m[32m    console.log(`📊 Step 3: Looking for "Download CSV" option...`);[m
[32m+[m[41m    [m
[32m+[m[32m    // Step 3: Click "Download CSV" from the dropdown[m
[32m+[m[32m    // Try different possible selectors for the download option[m
[32m+[m[32m    const downloadCSVOption = await page.waitForSelector('div.item:has-text("Download"), div:has-text("CSV"), [role="menuitem"]:has-text("Download")', { timeout: 10000 });[m
[32m+[m[32m    await downloadCSVOption.click();[m
[32m+[m[41m    [m
     // Wait for the download to start[m
[32m+[m[32m    console.log(`📥 Waiting for CSV download...`);[m
     const downloadPromise = page.waitForEvent('download');[m
     [m
     // Wait for the download to complete[m
