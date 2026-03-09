import { cart } from './cart.js';

const IMGBB_API_KEY = '53fa14ae2f0767e183d1c2d9ee8f51a6'; // User provided key
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyVB6KZbhWLdP_qb0F68fTFWZp3aX1CsWUC3A9Z9-ax9vh_WZbkFaJES7cgwxSMuDa5/exec'; // User provided URL

export async function uploadToImgBB(file) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`https://api.imgbb.com/1/upload?expiration=5184000&key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) throw new Error('Slip upload failed');

    const result = await response.json();
    return result.data.url;
}

export async function sendOTP(email) {
    const response = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'sendOTP', email })
    });
    return response.json();
}

export async function verifyOTP(email, otp) {
    const response = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'verifyOTP', email, otp })
    });
    return response.json();
}

export async function submitOrder(orderData) {
    const response = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({ ...orderData, action: 'submitOrder' })
    });
    return response.json();
}

// PromptPay QR generation helper (simplified CRC16 calculation is complex, so we'll use a standard library pattern)
export function generatePromptPayQR(mobileOrTaxId, total) {
    // For this demonstration, we'll use a service or a simplified static QR link
    // Real implementation would use the promptpay-qr library logic
    // We'll use the API-based generator for better reliability in this standalone demo
    const amount = parseFloat(total).toFixed(2);
    return `https://promptpay.io/${mobileOrTaxId}/${amount}.png`;
}
