#!/bin/bash

echo "🚀 Sales Data Collection System Setup"
echo "====================================="
echo ""

# Check if running on Windows
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    echo "⚠️  Windows detected. Some features may require manual setup."
    echo ""
fi

# Check for required tools
echo "📋 Checking prerequisites..."

# Check for Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js found: $(node --version)"
else
    echo "❌ Node.js not found. Please install Node.js 18 or later."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check for npm
if command -v npm &> /dev/null; then
    echo "✅ npm found: $(npm --version)"
else
    echo "❌ npm not found. Please install npm."
    exit 1
fi

# Check for git
if command -v git &> /dev/null; then
    echo "✅ Git found: $(git --version)"
else
    echo "❌ Git not found. Please install Git."
    echo "   Download from: https://git-scm.com/"
    exit 1
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Configuration Setup"
echo "====================="
echo ""

# Create .env template if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env template..."
    cat > .env << EOF
# Treez.io Credentials
TREEZ_EMAIL=your-email@example.com
TREEZ_PASSWORD=your-password

# Google Drive Configuration
GOOGLE_FOLDER_NAME=MedsCafeReports

# Optional: Google Cloud Project ID (for Cloud Functions)
# GOOGLE_CLOUD_PROJECT_ID=your-project-id
EOF
    echo "✅ Created .env template"
    echo "   Please edit .env with your actual credentials"
else
    echo "✅ .env file already exists"
fi

# Create creds directory if it doesn't exist
if [ ! -d creds ]; then
    mkdir creds
    echo "✅ Created creds directory"
    echo "   Please add your Google Service Account credentials.json to this directory"
else
    echo "✅ creds directory already exists"
fi

echo ""
echo "🎯 Next Steps"
echo "============="
echo ""

echo "1. 📝 Edit .env file with your Treez.io credentials:"
echo "   - TREEZ_EMAIL: Your Treez.io login email"
echo "   - TREEZ_PASSWORD: Your Treez.io login password"
echo "   - GOOGLE_FOLDER_NAME: Name for Google Drive folder (optional)"

echo ""
echo "2. 🔑 Set up Google Cloud credentials:"
echo "   - Create a Google Cloud Project"
echo "   - Create a Service Account with Editor role"
echo "   - Download the JSON key file"
echo "   - Save it as creds/credentials.json"

echo ""
echo "3. 🚀 Choose your deployment option:"
echo ""
echo "   A) GitHub Actions (Recommended):"
echo "      - Push this code to a GitHub repository"
echo "      - Add secrets in repository settings"
echo "      - Workflow will run automatically"
echo ""
echo "   B) Google Cloud Functions:"
echo "      - Install Google Cloud CLI"
echo "      - Run: ./deploy-cloud-function.sh"
echo ""
echo "   C) Google Apps Script:"
echo "      - Copy google-apps-script/Code.gs to Apps Script"
echo "      - Set up triggers manually"

echo ""
echo "4. 🧪 Test the setup:"
echo "   - Run: npm start (for local testing)"
echo "   - Check that files are uploaded to Google Drive"

echo ""
echo "📚 For detailed instructions, see README.md"
echo ""
echo "✅ Setup complete! Good luck with your sales data collection!" 