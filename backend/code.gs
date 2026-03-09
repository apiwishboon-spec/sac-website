/**
 * SAC Order Processing System
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
    var action = data.action;
    
    if (action === "sendOTP") {
      return handleSendOTP(data.email);
    } else if (action === "verifyOTP") {
      return handleVerifyOTP(data.email, data.otp);
    } else {
      // Default: submitOrder
      return handleSubmitOrder(data);
    }
  } catch (error) {
    return createResponse({ "result": "error", "error": error.toString() });
  }
}

function handleSendOTP(email) {
  var otp = Math.floor(100000 + Math.random() * 900000).toString();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var otpSheet = ss.getSheetByName("OTPs") || ss.insertSheet("OTPs");
  
  // Clear old OTPs for this email
  var data = otpSheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 0; i--) {
    if (data[i][0] === email) {
      otpSheet.deleteRow(i + 1);
    }
  }
  
  otpSheet.appendRow([email, otp, new Date()]);
  
  MailApp.sendEmail(email, "SKA Club - Verification Code", "Your verification code is: " + otp);
  return createResponse({ "result": "success", "message": "OTP sent" });
}

function handleVerifyOTP(email, otp) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var otpSheet = ss.getSheetByName("OTPs");
  if (!otpSheet) return createResponse({ "result": "error", "message": "No OTP found" });
  
  var data = otpSheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === email && data[i][1].toString() === otp.toString()) {
      // Optional: check expiry (e.g., 10 mins)
      return createResponse({ "result": "success", "message": "OTP verified" });
    }
  }
  return createResponse({ "result": "error", "message": "Invalid OTP" });
}

function handleSubmitOrder(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow([
    new Date(),
    data.name,
    data.email,
    data.phone,
    data.address,
    data.cart,
    data.totalPrice,
    data.paymentSlipURL,
    "Pending"
  ]);
  
  sendConfirmationEmail(data);
  return createResponse({ "result": "success" });
}

function createResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sendConfirmationEmail(order) {
  var subject = "Order Confirmation - SKA Club Shop";
  var body = `Hi ${order.name},\n\nWe have received your order!\n\n` +
             `Items: ${order.cart}\n` +
             `Total: ฿${order.totalPrice}\n\n` +
             `Address: ${order.address}\n\n` +
             `Thank you for supporting Suankularb Astronomy Club.`;
  MailApp.sendEmail(order.email, subject, body);
}
