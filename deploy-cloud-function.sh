#!/bin/bash

# Deploy Google Cloud Function for Sales Data Collection
# Make sure you have gcloud CLI installed and authenticated

PROJECT_ID="your-project-id"  # Replace with your actual project ID
FUNCTION_NAME="sales-data-collection"
REGION="us-central1"

echo "Deploying Google Cloud Function..."

# Set the project
gcloud config set project $PROJECT_ID

# Deploy the function
gcloud functions deploy $FUNCTION_NAME \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --region $REGION \
  --source ./cloud-function \
  --entry-point collectSalesData \
  --memory 2GB \
  --timeout 540s \
  --set-env-vars TREEZ_EMAIL=$TREEZ_EMAIL,TREEZ_PASSWORD=$TREEZ_PASSWORD,GOOGLE_FOLDER_NAME=$GOOGLE_FOLDER_NAME

echo "Function deployed successfully!"
echo "Function URL: https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME"

# Create Cloud Scheduler jobs
echo "Creating Cloud Scheduler jobs..."

# Job for 4:20 PM EST (9:20 PM UTC)
gcloud scheduler jobs create http sales-data-420pm \
  --schedule="20 21 * * *" \
  --uri="https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME" \
  --http-method=POST \
  --location=$REGION

# Job for 9:15 PM EST (2:15 AM UTC next day)
gcloud scheduler jobs create http sales-data-915pm \
  --schedule="15 2 * * *" \
  --uri="https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME" \
  --http-method=POST \
  --location=$REGION

echo "Cloud Scheduler jobs created successfully!" 