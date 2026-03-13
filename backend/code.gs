/**
 * SAC Order Processing System
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this code.
 * 4. Deploy as a Web App (Access: Anyone).
 * 5. Replace API URLs in frontend files with the deployment URL.
 * 6. IMPORTANT: Set up the onEdit trigger by going to Triggers > Add Trigger > Choose "onEdit" function
 * 
 * REQUIRED SCOPES:
 * - https://www.googleapis.com/auth/script.external_request (for API calls)
 * - https://www.googleapis.com/auth/spreadsheets (for sheet access)
 * - https://www.googleapis.com/script.send_mail (for emails)
 */

// Use Script Properties to store sensitive keys securely
// SETUP: Go to Project Settings (Gear Icon) -> Script Properties
// Add 'TURNSTILE_SECRET' = (Your Cloudflare Secret Key)
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
    } else if (action === "getOrders") {
      return handleGetOrders(data.token);
    } else if (action === "markOrderDone") {
      return handleMarkOrderDone(data.token, data.rowIndex);
    } else if (action === "updateOrderStatus") {
      return handleUpdateOrderStatus(data.token, data.rowIndex, data.status);
    } else if (action === "deleteOrder") {
      return handleDeleteOrder(data.token, data.rowIndex);
    } else if (action === "getStats") {
      return handleGetStats(data.token);
    } else {
      // Default: submitOrder
      return handleSubmitOrder(data);
    }
  } catch (error) {
    Logger.log("Error in doPost: " + error.toString());
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

// Admin Functions
function handleGetOrders(token) {
  try {
    // Simple token validation (in production, use proper JWT)
    if (!token || !token.includes('sac_admin_token')) {
      return createResponse({ "result": "error", "error": "Invalid admin token" });
    }
    
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Orders");
    if (!sheet) {
      return createResponse({ "result": "error", "error": "Orders sheet not found" });
    }
    
    var data = sheet.getDataRange().getValues();
    var orders = [];
    
    // Skip header row and convert to objects
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row.length > 0 && row[0]) { // Check if row has data
        orders.push({
          rowIndex: i + 1, // Store actual 1-based row index for updating
          timestamp: row[0] || '',
          name: row[1] || '',
          email: row[2] || '',
          phone: row[3] || '',
          address: row[4] || '',
          cart: row[5] || '',
          totalPrice: row[6] || '',
          slipUrl: row[7] || '',
          status: row[8] || 'Pending'
        });
      }
    }
    
    return createResponse({ 
      "result": "success", 
      "data": { 
        "orders": orders 
      } 
    });
  } catch (error) {
    Logger.log("Error in handleGetOrders: " + error.toString());
    return createResponse({ "result": "error", "error": error.toString() });
  }
}

function handleMarkOrderDone(token, rowIndex) {
  try {
    if (!token || !token.includes('sac_admin_token')) {
      return createResponse({ "result": "error", "error": "Invalid admin token" });
    }
    
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Orders");
    if (!sheet) {
      return createResponse({ "result": "error", "error": "Orders sheet not found" });
    }
    
    // Update status to "Done"
    // Update status to "Done" in column 9 (Status)
    // Update status to "Done" in column 9 (Status) using robust integer conversion
    var row = parseInt(rowIndex);
    if (!isNaN(row) && row > 1) {
      sheet.getRange(row, 9).setValue("Done");
    } else {
      throw new Error("Invalid row index: " + rowIndex);
    }
    
    return createResponse({ "result": "success" });
  } catch (error) {
    Logger.log("Error in handleMarkOrderDone: " + error.toString());
    return createResponse({ "result": "error", "error": error.toString() });
  }
}

function handleDeleteOrder(token, rowIndex) {
  try {
    if (!token || !token.includes('sac_admin_token')) {
      return createResponse({ "result": "error", "error": "Invalid admin token" });
    }
    
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Orders");
    if (!sheet) {
      return createResponse({ "result": "error", "error": "Orders sheet not found" });
    }
    
    var targetRow = parseInt(rowIndex);
    if (isNaN(targetRow) || targetRow <= 1) {
      return createResponse({ "result": "error", "error": "Invalid row index" });
    }

    sheet.deleteRow(targetRow);
    
    return createResponse({ "result": "success" });
  } catch (error) {
    return createResponse({ "result": "error", "error": error.toString() });
  }
}

function handleGetStats(token) {
  try {
    if (!token || !token.includes('sac_admin_token')) {
      return createResponse({ "result": "error", "error": "Invalid admin token" });
    }
    
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Orders");
    if (!sheet) {
      return createResponse({ "result": "error", "error": "Orders sheet not found" });
    }
    
    var data = sheet.getDataRange().getValues();
    var stats = {
      totalOrders: 0,
      completedOrders: 0,
      totalRevenue: 0,
      uniqueCustomers: [],
      productsSold: {}
    };
    
    // Process all orders
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row.length >= 9 && row[0]) {
        stats.totalOrders++;
        
        // Status is Column 9 (Index 8)
        var status = (row[8] || 'Pending').toString().trim();
        if (status === 'Done') {
          stats.completedOrders++;
        }
        
        // Total Price is Column 7 (Index 6)
        var total = parseFloat(row[6]) || 0;
        if (status === 'Done') {
          stats.totalRevenue += total;
        }
        
        // Email is Column 3 (Index 2)
        var email = row[2];
        if (email && stats.uniqueCustomers.indexOf(email) === -1) {
          stats.uniqueCustomers.push(email);
        }
        
        // Items is Column 6 (Index 5)
        var item = row[5];
        if (item) {
          stats.productsSold[item] = (stats.productsSold[item] || 0) + 1;
        }
      }
    }
    
    return createResponse({ 
      "result": "success", 
      "data": {
        "totalOrders": stats.totalOrders,
        "completedOrders": stats.completedOrders,
        "totalRevenue": stats.totalRevenue.toFixed(2),
        "uniqueCustomers": stats.uniqueCustomers.length,
        "productsSold": stats.productsSold
      }
    });
  } catch (error) {
    Logger.log("Error in handleGetStats: " + error.toString());
    return createResponse({ "result": "error", "error": error.toString() });
  }
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

function handleUpdateOrderStatus(token, rowIndex, newStatus) {
  try {
    if (!token || !token.includes('sac_admin_token')) {
      return createResponse({ "result": "error", "error": "Invalid admin token" });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var orderSheet = ss.getSheetByName("Orders");
    if (!orderSheet) {
      return createResponse({ "result": "error", "error": "Orders sheet not found" });
    }
    
    var data = orderSheet.getDataRange().getValues();
    var targetRow = parseInt(rowIndex);
    
    if (isNaN(targetRow) || targetRow <= 1 || targetRow > data.length) {
      return createResponse({ "result": "error", "error": "Invalid row index: " + rowIndex });
    }
    
    // Status is at Column 9
    orderSheet.getRange(targetRow, 9).setValue(newStatus);
    
    // Get info for email
    var rowData = data[targetRow - 1]; // 0-indexed
    var order = {
      name: rowData[1],
      email: rowData[2],
      cart: rowData[5],
      status: newStatus
    };
    
    sendStatusUpdateEmail(order);
    
    return createResponse({ "result": "success" });
  } catch (error) {
    return createResponse({ "result": "error", "error": error.toString() });
  }
}

// Keep the old one for compatibility if needed, but we used the new signature in doPost
function ___handleUpdateOrderStatus_legacy(orderId, newStatus) {
  
  var data = orderSheet.getDataRange().getValues();
  var headers = data[0];
  var orderIndex = -1;
  var statusColumnIndex = -1;
  var emailColumnIndex = -1;
  var nameColumnIndex = -1;
  var cartColumnIndex = -1;
  
  // Find column indices
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] === "Status") statusColumnIndex = i;
    if (headers[i] === "Email") emailColumnIndex = i;
    if (headers[i] === "Name") nameColumnIndex = i;
    if (headers[i] === "Cart") cartColumnIndex = i;
  }
  
  // Find the order by row number (orderId is row number)
  var targetRow = parseInt(orderId);
  if (targetRow <= 1 || targetRow > data.length) {
    return createResponse({ "result": "error", "message": "Invalid order ID" });
  }
  
  // Validate status
  var validStatuses = ["Pending", "Shipping", "Ready"];
  if (validStatuses.indexOf(newStatus) === -1) {
    return createResponse({ "result": "error", "message": "Invalid status" });
  }
  
  // Update the status
  orderSheet.getRange(targetRow, statusColumnIndex + 1).setValue(newStatus);
  
  // Get order details for email
  var orderData = data[targetRow - 1];
  var order = {
    name: orderData[nameColumnIndex],
    email: orderData[emailColumnIndex],
    cart: orderData[cartColumnIndex],
    status: newStatus
  };
  
  // Send status update email
  sendStatusUpdateEmail(order);
  
  return createResponse({ "result": "success", "message": "Order status updated successfully" });
}

// Automatic trigger function that runs when any cell is edited
function onEdit(e) {
  var range = e.range;
  var sheet = range.getSheet();
  
  // Check if the edit was made in the Orders sheet
  if (sheet.getName() !== "Orders") return;
  
  // Check if the edit was in the Status column (column 9, index 8)
  if (range.getColumn() !== 9) return;
  
  // Don't send email for header row
  if (range.getRow() === 1) return;
  
  // Get the new status value
  var newStatus = range.getValue();
  
  // Validate status
  var validStatuses = ["Pending", "Shipping", "Ready"];
  if (validStatuses.indexOf(newStatus) === -1) return;
  
  // Get order data from the row
  var orderData = sheet.getRange(range.getRow(), 1, 1, 8).getValues()[0];
  
  // Map columns: Timestamp(0), Name(1), Email(2), Phone(3), Address(4), Cart(5), Total Price(6), Payment Slip URL(7)
  var order = {
    name: orderData[1],      // Name column
    email: orderData[2],     // Email column
    cart: orderData[5],      // Cart column
    status: newStatus
  };
  
  // Send status update email
  sendStatusUpdateEmail(order);
}

function sendStatusUpdateEmail(order) {
  var statusMessages = {
    "Pending": {
      subject: "Order Processing - SAC Shop",
      title: "Your Order is Being Processed",
      message: "We're preparing your order and will notify you once it's ready for shipping.",
      color: "#dc2626" // Red
    },
    "Shipping": {
      subject: "Order Shipped - SAC Shop",
      title: "Your Order is on the Way!",
      message: "Great news! Your order has been shipped and is on its way to you.",
      color: "#eab308" // Yellow
    },
    "Ready": {
      subject: "Package Arrived - SAC Shop",
      title: "Your Package Has Arrived!",
      message: "Great news! Your package has arrived at your home and is ready to be opened.",
      color: "#10b981" // Green
    }
  };
  
  var statusInfo = statusMessages[order.status];
  if (!statusInfo) return;
  
  var htmlBody = `
    <html>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f7; color: #333;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                <!-- Header -->
                <tr>
                  <td style="background-color: ${statusInfo.color}; padding: 40px 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px;">SAC SHOP</h1>
                    <p style="color: #ffffff; margin: 5px 0 0; font-size: 14px; text-transform: uppercase;">Order Status Update</p>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin-top: 0; font-size: 20px;">Hi ${order.name},</h2>
                    <div style="background-color: #f8fafc; border-radius: 12px; padding: 25px; margin: 30px 0; border: 1px solid #e2e8f0; text-align: center;">
                      <div style="background-color: ${statusInfo.color}; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin-bottom: 15px; font-weight: bold; text-transform: uppercase;">
                        ${order.status}
                      </div>
                      <h3 style="margin-top: 0; font-size: 18px; color: #0f172a;">${statusInfo.title}</h3>
                      <p style="color: #64748b; line-height: 1.6; margin: 15px 0;">${statusInfo.message}</p>
                    </div>
                    
                    <div style="background-color: #fef3c7; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #f59e0b;">
                      <h4 style="margin-top: 0; font-size: 14px; color: #92400e;">Order Items:</h4>
                      <p style="margin: 10px 0; font-size: 13px; color: #78350f;">${order.cart}</p>
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
    subject: statusInfo.subject,
    htmlBody: htmlBody
  });
}

// Test function to manually trigger status update email
function testStatusEmail() {
  var testOrder = {
    name: "Test Customer",
    email: "your-email@example.com", // Replace with your email to test
    cart: "Test Product - ฿100",
    status: "Shipping"
  };
  
  sendStatusUpdateEmail(testOrder);
  return "Test email sent!";
}
