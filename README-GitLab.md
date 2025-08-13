# Treez Net Sales Collection - GitLab Version

## 🎯 **Project Overview**

This project automatically collects net sales data from Treez dispensary management system for multiple store locations. It runs on GitLab CI/CD with scheduled automation.

## 🚀 **What It Does**

- **Automated Login**: Securely logs into Treez portal
- **Net Sales Extraction**: Scrapes current day's net sales from each store
- **Multi-Store Support**: Processes Cheboygan and Alpena locations
- **Scheduled Execution**: Runs automatically at 4:20 PM and 9:15 PM EST
- **Data Export**: Saves results to CSV and uploads to Google Drive

## ⏰ **Schedule**

- **4:20 PM EST**: Mid-day collection (9:20 PM UTC)
- **9:15 PM EST**: Final collection (2:15 AM UTC next day)
- **Manual**: Trigger anytime via GitLab web interface

## 🏪 **Store Locations**

- **Cheboygan**: `https://medscafecheboygan.treez.io/`
- **Alpena**: `https://medscafealpena.treez.io/`

## 🔧 **Technical Details**

- **Language**: Node.js with Playwright
- **Browser**: Chromium (headless in CI/CD)
- **Data Format**: CSV with timestamp and collection type
- **Authentication**: Environment variables for credentials
- **Artifacts**: 30-day retention for CSV files

## 📁 **File Structure**

```
├── simple-net-sales.js     # Main collection script
├── .gitlab-ci.yml          # CI/CD pipeline configuration
├── uploadToDrive.js        # Google Drive upload utility
├── package.json            # Node.js dependencies
└── .env                    # Environment variables (not in repo)
```

## 🚀 **Quick Start**

### **1. Clone the Repository**
```bash
git clone https://gitlab.com/josh514-group/josh514-project.git
cd josh514-project
```

### **2. Install Dependencies**
```bash
npm install
npx playwright install chromium
```

### **3. Set Environment Variables**
Create a `.env` file:
```env
TREEZ_EMAIL=your-email@example.com
TREEZ_PASSWORD=your-password
```

### **4. Test Locally**
```bash
# Test mid-day collection
node simple-net-sales.js

# Test final collection
COLLECTION_TIME=final node simple-net-sales.js
```

## 🔄 **GitLab CI/CD Pipeline**

### **Pipeline Stages**
1. **Setup**: Install dependencies and Playwright
2. **Collect**: Run net sales collection
3. **Upload**: Upload results to Google Drive

### **Scheduled Jobs**
- **4:20 PM EST**: `collect-420pm` job
- **9:15 PM EST**: `collect-915pm` job

### **Manual Triggers**
- **Web Interface**: Use GitLab's "Run Pipeline" button
- **Variables**: Set `COLLECTION_TIME` to `mid-day` or `final`

## 📊 **Output Files**

### **CSV Results**
- `net-sales-mid-day-YYYY-MM-DD.csv`
- `net-sales-final-YYYY-MM-DD.csv`

### **Sample Output**
```csv
Store,Net Sales,Timestamp,Collection Type
cheboygan,2654.02,2025-08-11T21:30:00.000Z,mid-day
alpena,1412.99,2025-08-11T21:30:00.000Z,mid-day
```

## 🔐 **Security**

- **Credentials**: Stored as GitLab CI/CD variables
- **No Hardcoding**: All sensitive data in environment variables
- **Secure Storage**: GitLab variables are encrypted

## 🐛 **Troubleshooting**

### **Common Issues**
1. **Login Failures**: Check TREEZ_EMAIL and TREEZ_PASSWORD
2. **Browser Issues**: Ensure Playwright Chromium is installed
3. **Network Errors**: Verify internet connectivity

### **Debug Mode**
The script runs in visible mode locally for debugging. In GitLab CI/CD, it runs headless.

## 📈 **Monitoring**

- **Pipeline Logs**: View in GitLab CI/CD interface
- **Artifacts**: Download CSV files from pipeline artifacts
- **Schedules**: Monitor scheduled job execution

## 🔄 **Migration from GitHub**

This project was migrated from GitHub Actions to GitLab CI/CD to resolve timezone issues and improve reliability.

### **Key Improvements**
- ✅ **No Timezone Issues**: GitLab runners handle EST properly
- ✅ **Simplified Logic**: Removed complex date selection
- ✅ **Better Reliability**: Cleaner, focused functionality
- ✅ **Faster Execution**: No CSV downloads or complex fallbacks

## 📞 **Support**

For issues or questions:
1. Check GitLab pipeline logs
2. Review local test results
3. Verify environment variables
4. Check Treez portal accessibility

---

**Status**: ✅ **Production Ready** - Successfully collecting net sales data from both store locations
