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
    } else {
      return handleSubmitOrder(data);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({"result": "error", "error": error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleSendOTP(email) {
  if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return ContentService.createTextOutput(JSON.stringify({"result": "error", "message": "Invalid email"})).setMimeType(ContentService.MimeType.JSON);
  }
  
  var otp = Math.floor(100000 + Math.random() * 900000).toString();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("OTPs") || ss.insertSheet("OTPs");
  
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 0; i--) {
    if (data[i][0] === email) sheet.deleteRow(i + 1);
  }
  
  sheet.appendRow([email, otp, new Date()]);
  
  MailApp.sendEmail({
    to: email,
    subject: "SAC - Verification Code",
    htmlBody: "Your OTP is: " + otp
  });
  
  return ContentService.createTextOutput(JSON.stringify({"result": "success"})).setMimeType(ContentService.MimeType.JSON);
}

function handleVerifyOTP(email, otp) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("OTPs");
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({"result": "error", "message": "No OTP"})).setMimeType(ContentService.MimeType.JSON);
  
  var data = sheet.getDataRange().getValues();
  var now = new Date();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === email && data[i][1].toString() === otp.toString()) {
      var otpTime = new Date(data[i][2]);
      if (now - otpTime < 5 * 60 * 1000) {
        sheet.deleteRow(i + 1);
        return ContentService.createTextOutput(JSON.stringify({"result": "success"})).setMimeType(ContentService.MimeType.JSON);
      }
    }
  }
  return ContentService.createTextOutput(JSON.stringify({"result": "error", "message": "Invalid OTP"})).setMimeType(ContentService.MimeType.JSON);
}

function handleSubmitOrder(data) {
  // Verify Turnstile
  var secret = PropertiesService.getScriptProperties().getProperty('TURNSTILE_SECRET');
  var response = UrlFetchApp.fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    payload: { secret: secret, response: data.turnstileToken }
  });
  
  var outcome = JSON.parse(response.getContentText());
  if (!outcome.success) {
    return ContentService.createTextOutput(JSON.stringify({"result": "error", "error": "Captcha failed"})).setMimeType(ContentService.MimeType.JSON);
  }

  // Save Order
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Orders");
  if (!sheet) {
    sheet = ss.insertSheet("Orders");
    sheet.appendRow(["Timestamp", "Name", "Email", "Phone", "Address", "Cart", "Total", "Slip URL", "Status"]);
  }
  
  sheet.appendRow([
    new Date(), data.name, data.email, data.phone, data.address,
    typeof data.cart === 'string' ? data.cart : JSON.stringify(data.cart),
    data.totalPrice, data.paymentSlipURL, "Pending"
  ]);
  
  // Send Email
  MailApp.sendEmail({
    to: data.email,
    subject: "Order Received - SAC Shop",
    htmlBody: "Hi " + data.name + ",<br>Thank you for your order!<br>Items: " + data.cart + "<br>Total: ฿" + data.totalPrice
  });
  
  return ContentService.createTextOutput(JSON.stringify({"result": "success"})).setMimeType(ContentService.MimeType.JSON);
}

function handleUploadImage(base64Image) {
  var key = PropertiesService.getScriptProperties().getProperty('IMGBB_API_KEY');
  if (!key) {
    return ContentService.createTextOutput(JSON.stringify({"result": "error", "error": "No API key"})).setMimeType(ContentService.MimeType.JSON);
  }

  var rawBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  if (!rawBase64) {
    return ContentService.createTextOutput(JSON.stringify({"result": "error", "error": "Invalid image"})).setMimeType(ContentService.MimeType.JSON);
  }

  var response = UrlFetchApp.fetch("https://api.imgbb.com/1/upload?expiration=5184000&key=" + key, {
    method: "POST",
    payload: { image: rawBase64 }
  });

  var result = JSON.parse(response.getContentText());
  if (result.success) {
    return ContentService.createTextOutput(JSON.stringify({"result": "success", "url": result.data.url})).setMimeType(ContentService.MimeType.JSON);
  } else {
    return ContentService.createTextOutput(JSON.stringify({"result": "error", "error": "Upload failed"})).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleGetPaymentQR(amount) {
  var id = PropertiesService.getScriptProperties().getProperty('PROMPTPAY_ID');
  if (!id) {
    return ContentService.createTextOutput(JSON.stringify({"result": "error", "error": "No PromptPay ID"})).setMimeType(ContentService.MimeType.JSON);
  }
  
  var amtStr = parseFloat(amount).toFixed(2);
  var qrUrl = "https://promptpay.io/" + id + "/" + amtStr + ".png";
  
  return ContentService.createTextOutput(JSON.stringify({"result": "success", "qrUrl": qrUrl})).setMimeType(ContentService.MimeType.JSON);
}
