# Treez Sales Data Collection - Google Cloud Function

This Cloud Function collects sales data from Treez dispensary management system and calculates daily totals.

## 🚀 Features

- **Better Performance**: Faster downloads and more reliable connections
- **Longer Timeouts**: 60-second download timeout vs 30 seconds
- **Enhanced Debugging**: Detailed logging for troubleshooting
- **Automatic Retries**: Better error handling than GitHub Actions

## 📋 Prerequisites

1. **Google Cloud Project** with billing enabled
2. **Google Cloud CLI** installed and configured
3. **Treez Login Credentials** (email and password)

## 🔧 Setup

### 1. Install Dependencies
```bash
cd cloud-function
npm install
```

### 2. Install Playwright Browsers
```bash
npx playwright install chromium
```

### 3. Set Environment Variables
```bash
# Set your Treez credentials
gcloud functions deploy collectSalesData \
  --set-env-vars TREEZ_EMAIL=your-email@example.com,TREEZ_PASSWORD=your-password,COLLECTION_TIME=final
```

## 🚀 Deployment

### Deploy the Function
```bash
npm run deploy
```

Or manually:
```bash
gcloud functions deploy collectSalesData \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --memory 2GB \
  --timeout 540s \
  --region us-east1
```

## ⏰ Scheduling

### Option 1: Cloud Scheduler (Recommended)
```bash
# Create scheduler for 9:15 PM EST (2:15 AM UTC)
gcloud scheduler jobs create http treez-final-collection \
  --schedule="0 15 2 * * *" \
  --uri="YOUR_FUNCTION_URL" \
  --http-method=POST \
  --location=us-east1

# Create scheduler for 4:20 PM EST (9:20 PM UTC)
gcloud scheduler jobs create http treez-midday-collection \
  --schedule="0 20 21 * * *" \
  --uri="YOUR_FUNCTION_URL" \
  --http-method=POST \
  --location=us-east1
```

### Option 2: Manual Testing
```bash
# Test the function manually
curl -X POST YOUR_FUNCTION_URL
```

## 📊 Expected Results

The function will return JSON with:
```json
{
  "success": true,
  "results": {
    "cheboygan": 1234.56,
    "lowell": 2345.67,
    "alpena": 3456.78,
    "gaylord": 4567.89,
    "rc": 5678.90,
    "manistee": 6789.01
  },
  "totalSales": 24282.81,
  "collectionType": "FINAL",
  "timestamp": "2025-08-04T02:15:00.000Z"
}
```

## 🔍 Troubleshooting

### Check Function Logs
```bash
gcloud functions logs read collectSalesData --limit=50
```

### Test Locally
```bash
# Set environment variables
export TREEZ_EMAIL=your-email@example.com
export TREEZ_PASSWORD=your-password
export COLLECTION_TIME=final

# Run locally
npm start
```

## 💰 Cost Estimation

- **Cloud Functions**: ~$0.40/month (2GB memory, 540s timeout)
- **Cloud Scheduler**: ~$0.10/month (2 scheduled jobs)
- **Total**: ~$0.50/month

## 🆚 vs GitHub Actions

| Feature | GitHub Actions | Cloud Functions |
|---------|---------------|-----------------|
| **Download Timeout** | 30s | 60s |
| **Memory** | 7GB | 2GB |
| **Network** | Shared | Dedicated |
| **Cost** | Free | ~$0.50/month |
| **Reliability** | Medium | High |

## 🎯 Benefits

1. **Better CSV Downloads**: More reliable than GitHub Actions
2. **Faster Execution**: Dedicated resources
3. **Better Debugging**: Enhanced logging
4. **Automatic Retries**: Built-in error handling
5. **Timezone Consistency**: Runs in US East region 