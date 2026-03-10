/**
 * SAC Order Processing System
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this code.
 * 4. Deploy as a Web App (Access: Anyone).
 * 5. Replace "YOUR_GAS_WEB_APP_URL" in js/checkout.js with the deployment URL.
 * 
 * REQUIRED SCOPES:
 * - https://www.googleapis.com/auth/script.external_request (for API calls)
 * - https://www.googleapis.com/auth/spreadsheets (for sheet access)
 * - https://www.googleapis.com/script.send_mail (for emails)
 */

// Use Script Properties to store sensitive keys securely
// SETUP: Go to Project Settings (Gear Icon) -> Script Properties
// Add 'TURNSTILE_SECRET' = 0x4AAAAAACoVB1YJTL-5_UymIf5_rkv1Svo
// Add 'IMGBB_API_KEY' = (Your ImgBB Key)
// Add 'PROMPTPAY_ID' = (Your Phone Number or Tax ID, e.g., 0812345678)
const TURNSTILE_SECRET = PropertiesService.getScriptProperties().getProperty('TURNSTILE_SECRET'); 
const IMGBB_API_KEY = PropertiesService.getScriptProperties().getProperty('IMGBB_API_KEY');
const PROMPTPAY_ID = PropertiesService.getScriptProperties().getProperty('PROMPTPAY_ID');

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    
    if (action === "sendOTP") {
      return handleSendOTP(data.email);
    } else if (action === "verifyOTP") {
      return handleVerifyOTP(data.email, data.otp);
    } else if (action === "uploadImage") {
      return handleUploadImage(data.base64Image);
    } else if (action === "getPaymentQR") {
      return handleGetPaymentQR(data.amount);
    } else if (action === "updateOrderStatus") {
      return handleUpdateOrderStatus(data.orderId, data.status);
    } else if (action === "getOrderStatus") {
      return handleGetOrderStatus(data.orderId);
    } else if (action === "sendStatusEmail") {
      return handleSendStatusEmail(data.orderId, data.status, data.customerEmail);
    } else {
      // Default: submitOrder
      return handleSubmitOrder(data);
    }
  } catch (error) {
    return createResponse({ "result": "error", "error": error.toString() });
  }
}

function handleSendOTP(email) {
  // Basic email validation
  if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return createResponse({ "result": "error", "message": "Invalid email format" });
  }
  
  var otp = Math.floor(100000 + Math.random() * 900000).toString();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var otpSheet = ss.getSheetByName("OTPs") || ss.insertSheet("OTPs");
  
  var data = otpSheet.getDataRange().getValues();
  var now = new Date();
  var rateLimitWindow = 1 * 60 * 1000; // 1 minute
  
  // Check rate limiting
  for (var i = data.length - 1; i >= 0; i--) {
    if (data[i][0] === email) {
      var lastOtpTime = new Date(data[i][2]);
      if (now - lastOtpTime < rateLimitWindow) {
        return createResponse({ "result": "error", "message": "Please wait before requesting another OTP" });
      }
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
      <p style="color: #666;">This code will expire in 5 minutes.</p>
    </div>`
  });
  
  return createResponse({ "result": "success", "message": "OTP sent" });
}

function handleVerifyOTP(email, otp) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var otpSheet = ss.getSheetByName("OTPs");
  if (!otpSheet) return createResponse({ "result": "error", "message": "No OTP found" });
  
  var data = otpSheet.getDataRange().getValues();
  var now = new Date();
  var otpExpiration = 5 * 60 * 1000; // 5 minutes
  
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === email && data[i][1].toString() === otp.toString()) {
      var otpTime = new Date(data[i][2]);
      if (now - otpTime < otpExpiration) {
        // Clear used OTP
        otpSheet.deleteRow(i + 1);
        return createResponse({ "result": "success", "message": "OTP verified" });
      } else {
        // Clear expired OTP
        otpSheet.deleteRow(i + 1);
        return createResponse({ "result": "error", "message": "OTP expired" });
      }
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var orderSheet = ss.getSheetByName("Orders");
  if (!orderSheet) {
    orderSheet = ss.insertSheet("Orders");
    // Set headers if sheet is new
    orderSheet.appendRow(["Timestamp", "Name", "Email", "Phone", "Address", "Cart", "Total Price", "Payment Slip URL", "Status"]);
  }
  
  // Ensure cart data is string
  var cartData = typeof data.cart === 'string' ? data.cart : JSON.stringify(data.cart);
  
  orderSheet.appendRow([
    new Date(),
    data.name,
    data.email,
    data.phone,
    data.address,
    cartData,
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

function handleUploadImage(base64Image) {
  if (!IMGBB_API_KEY) {
    return createResponse({ "result": "error", "error": "IMGBB_API_KEY not configured in backend." });
  }

  // More robust base64 parsing
  var rawBase64;
  if (base64Image.includes(',')) {
    rawBase64 = base64Image.split(',')[1];
  } else {
    rawBase64 = base64Image;
  }
  
  // Validate base64
  if (!rawBase64 || rawBase64.length === 0) {
    return createResponse({ "result": "error", "error": "Invalid image data" });
  }

  var response = UrlFetchApp.fetch("https://api.imgbb.com/1/upload?expiration=5184000&key=" + IMGBB_API_KEY, {
    method: "POST",
    payload: {
      image: rawBase64
    }
  });

  var result = JSON.parse(response.getContentText());
  if (result.success) {
    return createResponse({ "result": "success", "url": result.data.url });
  } else {
    return createResponse({ "result": "error", "error": "ImgBB upload failed" });
  }
}

function handleGetPaymentQR(amount) {
  if (!PROMPTPAY_ID) {
    return createResponse({ "result": "error", "error": "PROMPTPAY_ID not configured in backend." });
  }
  
  // Format amount to 2 decimal places as string
  var amtStr = parseFloat(amount).toFixed(2);
  
  // Return the QR implementation URL
  // Real dynamic generation would use promptpay-qr logic, but this secure passthrough works too
  var qrUrl = "https://promptpay.io/" + PROMPTPAY_ID + "/" + amtStr + ".png";
  
  return createResponse({ "result": "success", "qrUrl": qrUrl });
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
    subject: `Order Received - SAC Shop #${Math.floor(Math.random() * 10000)}`,
    htmlBody: htmlBody
  });
}

// Order Tracking Functions
function handleUpdateOrderStatus(orderId, newStatus) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Orders");
    var data = sheet.getDataRange().getValues();
    
    // Find the order by ID (assuming ID is in column 1)
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == orderId) {
        // Update status (assuming status is in column 7)
        sheet.getRange(i + 1, 7).setValue(newStatus);
        
        // Get customer email for notification (assuming email is in column 3)
        var customerEmail = data[i][2];
        
        // Send status update email
        sendStatusUpdateEmail(orderId, newStatus, customerEmail);
        
        return createResponse({
          "result": "success",
          "message": "Order status updated successfully"
        });
      }
    }
    
    return createResponse({
      "result": "error",
      "error": "Order not found"
    });
  } catch (error) {
    return createResponse({
      "result": "error",
      "error": error.toString()
    });
  }
}

function handleGetOrderStatus(orderId) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Orders");
    var data = sheet.getDataRange().getValues();
    
    // Find the order by ID
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == orderId) {
        var orderData = {
          "orderId": data[i][0],
          "date": data[i][1].toISOString(),
          "customerName": data[i][2],
          "email": data[i][3],
          "status": data[i][6], // Status column
          "total": data[i][7],
          "items": JSON.parse(data[i][8] || "[]")
        };
        
        return createResponse({
          "result": "success",
          "order": orderData
        });
      }
    }
    
    return createResponse({
      "result": "error",
      "error": "Order not found"
    });
  } catch (error) {
    return createResponse({
      "result": "error",
      "error": error.toString()
    });
  }
}

function handleSendStatusEmail(orderId, status, customerEmail) {
  try {
    sendStatusUpdateEmail(orderId, status, customerEmail);
    
    return createResponse({
      "result": "success",
      "message": "Status email sent successfully"
    });
  } catch (error) {
    return createResponse({
      "result": "error",
      "error": error.toString()
    });
  }
}

function sendStatusUpdateEmail(orderId, status, customerEmail) {
  var statusTexts = {
    "pending": "รอดำเนินการ / Pending",
    "shipping": "กำลังจัดส่ง / Shipping",
    "ready": "พร้อมรับสินค้า / Ready for Pickup"
  };
  
  var statusColors = {
    "pending": "#ffc107",
    "shipping": "#17a2b8", 
    "ready": "#28a745"
  };
  
  var statusText = statusTexts[status] || status;
  var statusColor = statusColors[status] || "#6c757d";
  
  var htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 30px 40px; text-align: center; border-bottom: 1px solid #e9ecef;">
                  <h1 style="margin: 0; color: #0f111a; font-size: 24px;">
                    <i class="fas fa-meteor" style="color: #6366f1;"></i> Suankularb Astronomy Club
                  </h1>
                  <p style="margin: 10px 0 0 0; color: #6c757d; font-size: 16px;">Order Status Update</p>
                </td>
              </tr>
              
              <!-- Status Update -->
              <tr>
                <td style="padding: 40px;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h2 style="margin: 0 0 10px 0; color: #0f111a;">Order #${orderId}</h2>
                    <div style="display: inline-block; padding: 12px 24px; background-color: ${statusColor}; color: white; border-radius: 25px; font-weight: bold; font-size: 16px;">
                      ${statusText}
                    </div>
                  </div>
                  
                  <p style="margin: 0 0 20px 0; color: #495057; line-height: 1.6;">
                    Dear Customer,<br><br>
                    Your order status has been updated. You can track your order progress using the link below.
                  </p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="https://apiwishboon-spec.github.io/sac-website/order-tracking.html" 
                           style="display: inline-block; padding: 15px 30px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                          Track Your Order
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0; color: #6c757d; font-size: 14px;">
                    If you have any questions, please contact us at:<br>
                    📧 Email: sac@suan.ac.th<br>
                    📱 Phone: 02-123-4567
                  </p>
                  <p style="margin: 20px 0 0 0; font-size: 11px; color: #cbd5e1;">
                    This is an automated message. Please do not reply to this email.
                  </p>
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
    to: customerEmail,
    subject: `Order Status Update - SAC Shop #${orderId}`,
    htmlBody: htmlBody
  });
}
