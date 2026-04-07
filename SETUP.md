# USA Wholesale - Merge Tool Setup

## Quick Start (2 steps)

### Step 1: Deploy Google Apps Script (backend)
1. Go to [script.google.com](https://script.google.com) and click **New project**
2. Delete everything in `Code.gs` and paste the contents of `Code.gs` from this repo
3. Click **Deploy** > **New deployment**
4. Click the gear icon and select **Web app**
5. Set **Execute as**: Me
6. Set **Who has access**: Anyone
7. Click **Deploy** and **Authorize access** (approve permissions)
8. Copy the **Web app URL** (looks like `https://script.google.com/macros/s/XXXXX/exec`)

### Step 2: Connect frontend to backend
1. Open `index.html` in this repo
2. Find this line near the top of the `<script>` section:
   ```js
   const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL_HERE';
   ```
3. Replace `YOUR_APPS_SCRIPT_URL_HERE` with the URL from Step 1
4. Commit and push to GitHub

The site will be live at: `https://michaelm-dot.github.io/wholesale-merge-tool/`

## How It Works
1. User uploads 2 files on the webpage (raw distributor + Keepa export)
2. Files are parsed client-side using SheetJS (no data sent to any server during parsing)
3. Merged data is sent to your Google Apps Script
4. Apps Script creates a new Google Sheet with:
   - **Work Sheet**: All matched products with formulas for Total Price and 30D Profit
   - **Clean Sheet**: Auto-filters items where ROI % >= threshold (default -15%)
5. Sheet is shared as "Anyone with link can edit"
6. User gets the Google Sheet link
