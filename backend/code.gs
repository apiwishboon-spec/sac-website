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

const TURNSTILE_SECRET = "0x4AAAAAAACoVB1YJTL-5_UymIf5_rkv1Svo";

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
  
  var data = otpSheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 0; i--) {
    if (data[i][0] === email) {
      otpSheet.deleteRow(i + 1);
    }
  }
  
  otpSheet.appendRow([email, otp, new Date()]);
  
  // Send OTP with simple HTML styling
  MailApp.sendEmail({
    to: email,
    subject: "SAC - Verification Code",
    htmlBody: `<div style="font-family: sans-serif; padding: 20px; text-align: center;">
      <h2>Verification Code</h2>
      <p>Your code to secure your order at SAC Shop is:</p>
      <div style="font-size: 32px; font-weight: bold; color: #4f46e5; margin: 20px 0;">${otp}</div>
      <p style="color: #666;">This code will expire shortly.</p>
    </div>`
  });
  
  return createResponse({ "result": "success", "message": "OTP sent" });
}

function handleVerifyOTP(email, otp) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var otpSheet = ss.getSheetByName("OTPs");
  if (!otpSheet) return createResponse({ "result": "error", "message": "No OTP found" });
  
  var data = otpSheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === email && data[i][1].toString() === otp.toString()) {
      return createResponse({ "result": "success", "message": "OTP verified" });
    }
  }
  return createResponse({ "result": "error", "message": "Invalid OTP" });
}

function handleSubmitOrder(data) {
  // 1. Verify Turnstile
  var response = UrlFetchApp.fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    payload: {
      secret: TURNSTILE_SECRET,
      response: data.turnstileToken
    }
  });
  
  var outcome = JSON.parse(response.getContentText());
  if (!outcome.success) {
    return createResponse({ "result": "error", "error": "Security verification failed." });
  }

  // 2. Save Order
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
  var htmlBody = `
    <html>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f7; color: #333;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                <!-- Header -->
                <tr>
                  <td style="background-color: #0f172a; padding: 40px 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px;">SAC SHOP</h1>
                    <p style="color: #94a3b8; margin: 5px 0 0; font-size: 14px; text-transform: uppercase;">Order Confirmation</p>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin-top: 0; font-size: 20px;">Hi ${order.name},</h2>
                    <p style="color: #64748b; line-height: 1.6;">Thank you for your order! We have received your payment slip and are currently processing your request.</p>
                    
                    <div style="background-color: #f8fafc; border-radius: 12px; padding: 25px; margin: 30px 0; border: 1px solid #e2e8f0;">
                      <h3 style="margin-top: 0; font-size: 16px; color: #0f172a;">Order Details</h3>
                      <p style="margin: 10px 0; font-size: 14px; color: #475569;"><strong>Items:</strong> ${order.cart}</p>
                      <p style="margin: 10px 0; font-size: 14px; color: #475569;"><strong>Total Amount:</strong> ฿${order.totalPrice}</p>
                      <p style="margin: 10px 0; font-size: 14px; color: #475569;"><strong>Shipping Address:</strong><br>${order.address.replace(/\n/g, '<br>')}</p>
                    </div>
                    
                    <p style="color: #64748b; line-height: 1.6; font-size: 14px;">If you have any questions, please reply to this email or contact us via our social media channels.</p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f1f5f9; padding: 30px; text-align: center;">
                    <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: bold;">SAC (Suankularb Astronomy Club)</p>
                    <p style="margin: 5px 0; font-size: 12px; color: #94a3b8;">
                      88 ถนนตรีเพชร แขวงวังบูรพาภิรมย์ เขตพระนคร กรุงเทพมหานคร 10200
                    </p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    <p style="margin: 0; font-size: 11px; color: #cbd5e1;">&copy; 2026 Suankularb Astronomy Club. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  MailApp.sendEmail({
    to: order.email,
    subject: `Order Recieved - SAC Shop #${Math.floor(Math.random() * 10000)}`,
    htmlBody: htmlBody
  });
}
