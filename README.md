# Sales Data Collection System

This system automatically collects sales data from multiple Treez.io stores twice daily and uploads the CSV files to Google Drive.

## Features

- **Automated Data Collection**: Runs at 4:20 PM and 9:15 PM EST daily
- **Multiple Deployment Options**: GitHub Actions, Google Cloud Functions, and Google Apps Script
- **Google Drive Integration**: Automatically uploads CSV files to organized folders
- **Error Handling**: Comprehensive logging and error reporting
- **Data Processing**: Optional Google Apps Script for additional data analysis

## Store Locations

- Cheboygan
- Lowell  
- Alpena
- Gaylord
- RC
- Manistee

## Deployment Options

### Option 1: GitHub Actions (Recommended)

**Pros:**
- Free for public repositories
- Easy to monitor and debug
- Version control integration
- Manual trigger capability

**Setup:**

1. **Fork/Clone this repository**

2. **Set up GitHub Secrets:**
   - Go to your repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `TREEZ_EMAIL`: Your Treez.io login email
     - `TREEZ_PASSWORD`: Your Treez.io login password
     - `GOOGLE_CREDENTIALS`: Your Google Service Account JSON credentials
     - `GOOGLE_FOLDER_NAME`: Name for the Google Drive folder (default: "MedsCafeReports")

3. **The workflow will automatically run:**
   - 4:20 PM EST daily (9:20 PM UTC)
   - 9:15 PM EST daily (2:15 AM UTC next day)
   - Can be manually triggered via GitHub Actions tab

### Option 2: Google Cloud Functions

**Pros:**
- Serverless, no maintenance
- Integrated with Google Cloud ecosystem
- Can be triggered via HTTP or Cloud Scheduler

**Setup:**

1. **Install Google Cloud CLI:**
   ```bash
   # Download and install from: https://cloud.google.com/sdk/docs/install
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Enable required APIs:**
   ```bash
   gcloud services enable cloudfunctions.googleapis.com
   gcloud services enable cloudscheduler.googleapis.com
   gcloud services enable drive.googleapis.com
   ```

3. **Set environment variables:**
   ```bash
   export TREEZ_EMAIL="your-email@example.com"
   export TREEZ_PASSWORD="your-password"
   export GOOGLE_FOLDER_NAME="MedsCafeReports"
   ```

4. **Deploy the function:**
   ```bash
   chmod +x deploy-cloud-function.sh
   ./deploy-cloud-function.sh
   ```

5. **Update the PROJECT_ID in deploy-cloud-function.sh before running**

### Option 3: Google Apps Script

**Pros:**
- Free and easy to set up
- Built-in Google Sheets integration
- Can process and analyze collected data

**Setup:**

1. **Go to [Google Apps Script](https://script.google.com/)**

2. **Create a new project**

3. **Copy the code from `google-apps-script/Code.gs`**

4. **Set up triggers:**
   - Run `setupDailyTrigger()` once to create automatic triggers
   - Or manually run `manualProcess()` for testing

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TREEZ_EMAIL` | Your Treez.io login email | Yes |
| `TREEZ_PASSWORD` | Your Treez.io login password | Yes |
| `GOOGLE_FOLDER_NAME` | Google Drive folder name | No (default: "MedsCafeReports") |

### Google Cloud Setup

1. **Create a Google Cloud Project**

2. **Create a Service Account:**
   - Go to IAM & Admin → Service Accounts
   - Create a new service account
   - Download the JSON key file
   - Grant "Editor" role

3. **Enable Google Drive API:**
   - Go to APIs & Services → Library
   - Search for "Google Drive API"
   - Enable it

4. **Share the Google Drive folder with your service account email**

## Monitoring and Troubleshooting

### GitHub Actions
- Check the Actions tab in your repository
- View logs for each run
- Failed runs will upload error logs as artifacts

### Google Cloud Functions
- Check Cloud Functions logs in Google Cloud Console
- Monitor Cloud Scheduler jobs
- Set up alerts for function failures

### Google Apps Script
- Check execution logs in Apps Script editor
- Monitor trigger execution history

## File Structure

```
├── .github/workflows/
│   └── sales-data-collection.yml    # GitHub Actions workflow
├── cloud-function/
│   ├── main.js                      # Cloud Function code
│   └── package.json                 # Function dependencies
├── google-apps-script/
│   └── Code.gs                      # Apps Script code
├── index.js                         # Main application
├── uploadToDrive.js                 # Google Drive upload logic
├── package.json                     # Node.js dependencies
├── deploy-cloud-function.sh         # Deployment script
└── README.md                        # This file
```

## Security Considerations

- Store sensitive credentials as environment variables or secrets
- Use service accounts with minimal required permissions
- Regularly rotate passwords and API keys
- Monitor access logs for unusual activity

## Troubleshooting

### Common Issues

1. **Authentication Errors:**
   - Verify Treez.io credentials are correct
   - Check if Google Drive API is enabled
   - Ensure service account has proper permissions

2. **Download Failures:**
   - Check if store URLs are accessible
   - Verify page selectors haven't changed
   - Ensure network connectivity

3. **Upload Failures:**
   - Check Google Drive folder permissions
   - Verify service account has write access
   - Check available storage space

### Getting Help

- Check the logs for specific error messages
- Verify all environment variables are set correctly
- Test with a single store first
- Use manual triggers for debugging

## License

This project is for internal use only. Please ensure compliance with Treez.io terms of service and applicable data protection regulations. 