/**
 * SKA CLUB Order Processing System
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this code.
 * 4. Deploy as a Web App (Access: Anyone).
 * 5. Replace "YOUR_GAS_WEB_APP_URL" in js/checkout.js with the deployment URL.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Append order to sheet
    sheet.appendRow([
      new Date(),
      data.name,
      data.email,
      data.phone,
      data.address,
      data.cart,
      data.totalPrice,
      data.paymentSlipURL,
      "Pending" // Order Status
    ]);
    
    // Send confirmation email
    sendConfirmationEmail(data);
    
    return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function sendConfirmationEmail(order) {
  var subject = "Order Confirmation - SKA Club Shop";
  var body = `Hi ${order.name},\n\nWe have received your order!\n\n` +
             `Items: ${order.cart}\n` +
             `Total: ฿${order.totalPrice}\n\n` +
             `We will process your order and ship it to:\n${order.address}\n\n` +
             `Thank you for supporting Suankularb Astronomy Club.`;
  
  MailApp.sendEmail(order.email, subject, body);
}
