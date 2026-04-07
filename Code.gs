/**
 * USA Wholesale - Merge Tool Backend
 * Google Apps Script - Deploy as Web App
 *
 * This script receives merged product data from the GitHub Pages frontend
 * and creates a new Google Sheet with Work Sheet + Clean Sheet.
 *
 * SETUP:
 * 1. Go to https://script.google.com and create a new project
 * 2. Paste this entire file into Code.gs
 * 3. Click Deploy > New deployment
 * 4. Select type: Web app
 * 5. Execute as: Me (your email)
 * 6. Who has access: Anyone
 * 7. Copy the URL and paste it into index.html (APPS_SCRIPT_URL)
 */

function doPost(e) {
  try {
    var payload;

    // Handle both JSON body and form submission
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e.parameter && e.parameter.payload) {
      payload = JSON.parse(e.parameter.payload);
    } else {
      return sendResponse({ error: 'No data received' });
    }

    var data = payload.data;
    var markupPct = payload.markup || 2;
    var roiThreshold = (payload.roiThreshold || -15) / 100; // Convert to decimal
    var distributor = payload.distributor || 'Unknown';

    if (!data || data.length === 0) {
      return sendResponse({ error: 'No product data to process' });
    }

    // Create new spreadsheet
    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM-dd-yyyy');
    var sheetName = distributor + '_worksheet_' + timestamp;
    var ss = SpreadsheetApp.create(sheetName);

    // --- Work Sheet ---
    var ws = ss.getActiveSheet();
    ws.setName('Work Sheet');

    // Headers (25 columns A-Y)
    var headers = [
      'ASIN', 'UPC', 'Status', 'Notes', 'Recomended Sellable Qty',
      'Unit Cost', '90Days Average', 'Bundle Size', 'Profit Per Unit', 'ROI %',
      'Breakeven', 'Total Price', '30D Profit', 'Amazon link', 'Brand',
      'Distributor', 'Date Last Reviewed', 'PR By', 'PR Date', '30d Sales',
      'Good ASINs', 'For Review', 'Finished Lines', 'Sales Rank', 'Category'
    ];

    ws.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Format headers
    var headerRange = ws.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#375623');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setWrap(true);
    ws.setFrozenRows(1);

    // Populate data rows
    var rows = [];
    for (var i = 0; i < data.length; i++) {
      var d = data[i];
      rows.push([
        d.asin || '',           // A: ASIN
        d.upc || '',            // B: UPC
        '',                     // C: Status (manual)
        '',                     // D: Notes (manual)
        '',                     // E: Recomended Sellable Qty (manual)
        d.unit_cost || '',      // F: Unit Cost
        d.buy_box_90 || '',     // G: 90Days Average
        '',                     // H: Bundle Size (manual)
        '',                     // I: Profit Per Unit (manual)
        '',                     // J: ROI % (manual)
        '',                     // K: Breakeven (manual)
        '',                     // L: Total Price (formula)
        '',                     // M: 30D Profit (formula)
        d.amazon_link || '',    // N: Amazon link
        d.brand || '',          // O: Brand
        d.distributor || '',    // P: Distributor
        '',                     // Q: Date Last Reviewed
        '',                     // R: PR By
        '',                     // S: PR Date
        d.sales_30d || '',      // T: 30d Sales
        '',                     // U: Good ASINs
        '',                     // V: For Review
        '',                     // W: Finished Lines
        d.sales_rank || '',     // X: Sales Rank
        d.category || ''        // Y: Category
      ]);
    }

    if (rows.length > 0) {
      ws.getRange(2, 1, rows.length, 25).setValues(rows);
    }

    // Add formulas for Total Price (L) and 30D Profit (M)
    var lastRow = rows.length + 1;
    for (var r = 2; r <= lastRow; r++) {
      // Total Price = Recomended Sellable Qty * Unit Cost
      ws.getRange(r, 12).setFormula('=IF(OR(E' + r + '="",F' + r + '=""),"",E' + r + '*F' + r + ')');
      // 30D Profit = Profit Per Unit * 30d Sales
      ws.getRange(r, 13).setFormula('=IF(OR(I' + r + '="",T' + r + '=""),"",I' + r + '*T' + r + ')');
    }

    // Color coding
    // Yellow for manual input columns: E, H, I, J, K (5,8,9,10,11)
    var manualCols = [5, 8, 9, 10, 11];
    for (var c = 0; c < manualCols.length; c++) {
      ws.getRange(2, manualCols[c], rows.length, 1).setBackground('#FFF2CC');
    }

    // Green for formula columns: L, M (12, 13)
    ws.getRange(2, 12, rows.length, 1).setBackground('#E2EFDA');
    ws.getRange(2, 13, rows.length, 1).setBackground('#E2EFDA');

    // Format currency columns
    ws.getRange(2, 6, rows.length, 1).setNumberFormat('$#,##0.00');  // Unit Cost
    ws.getRange(2, 7, rows.length, 1).setNumberFormat('$#,##0.00');  // 90Days Average
    ws.getRange(2, 12, rows.length, 1).setNumberFormat('$#,##0.00'); // Total Price
    ws.getRange(2, 13, rows.length, 1).setNumberFormat('$#,##0.00'); // 30D Profit

    // Format ROI % column as percentage
    ws.getRange(2, 10, rows.length, 1).setNumberFormat('0.00%');

    // Format 30d Sales as number
    ws.getRange(2, 20, rows.length, 1).setNumberFormat('#,##0');

    // Auto-resize some columns
    ws.autoResizeColumn(1);  // ASIN
    ws.autoResizeColumn(2);  // UPC
    ws.autoResizeColumn(14); // Amazon link
    ws.autoResizeColumn(15); // Brand
    ws.autoResizeColumn(16); // Distributor
    ws.autoResizeColumn(25); // Category

    // --- Clean Sheet ---
    var cs = ss.insertSheet('Clean Sheet');

    // Clean Sheet headers (same as Work Sheet B-T columns)
    var cleanHeaders = [
      'UPC', 'Status', 'Notes', 'Recomended Sellable Qty', 'Unit Cost',
      '90Days Average', 'Bundle Size', 'Profit Per Unit', 'ROI %', 'Breakeven',
      'Total Price', '30D Profit', 'Amazon link', 'Brand', 'Distributor',
      'Date Last Reviewed', 'PR By', 'PR Date', '30d Sales'
    ];

    cs.getRange(1, 1, 1, cleanHeaders.length).setValues([cleanHeaders]);

    // Format Clean Sheet headers
    var csHeaderRange = cs.getRange(1, 1, 1, cleanHeaders.length);
    csHeaderRange.setFontWeight('bold');
    csHeaderRange.setBackground('#375623');
    csHeaderRange.setFontColor('#FFFFFF');
    csHeaderRange.setWrap(true);
    cs.setFrozenRows(1);

    // Add FILTER formula in A2 that pulls all columns B:T from Work Sheet
    // where ROI % (column J) >= threshold
    var filterFormula = '=IFERROR(FILTER(\'Work Sheet\'!B$2:T$' + lastRow +
      ',\'Work Sheet\'!J$2:J$' + lastRow + '>=' + roiThreshold + '),"")';
    cs.getRange(2, 1).setFormula(filterFormula);

    // --- Set sharing to Anyone with link can edit ---
    var file = DriveApp.getFileById(ss.getId());
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);

    var url = ss.getUrl();

    return sendResponse({
      url: url,
      name: sheetName,
      products: data.length
    });

  } catch (err) {
    return sendResponse({ error: err.toString() });
  }
}

function doGet(e) {
  return HtmlService.createHtmlOutput(
    '<h2>USA Wholesale Merge Tool - API</h2>' +
    '<p>This is the backend API. Use the <a href="https://tommygunzzzz.github.io/wholesale-merge-tool/">upload page</a> to merge files.</p>'
  );
}

function sendResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Test function - run this to verify the script works
function testCreate() {
  var testData = {
    data: [{
      asin: 'B07CTPZ88Q',
      upc: '37000749691',
      unit_cost: 27.54,
      buy_box_90: 29.83,
      amazon_link: 'https://www.amazon.com/dp/B07CTPZ88Q',
      brand: 'Pampers',
      distributor: 'TEST',
      sales_30d: 900,
      sales_rank: 1,
      category: 'Baby Products'
    }],
    markup: 2,
    roiThreshold: -15,
    distributor: 'TEST'
  };

  var e = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };

  var result = doPost(e);
  Logger.log(result.getContent());
}
