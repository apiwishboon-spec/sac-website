import { cart } from './cart.js';

const IMGBB_API_KEY = '53fa14ae2f0767e183d1c2d9ee8f51a6'; // User provided key
const GAS_WEB_APP_URL = 'YOUR_GAS_WEB_APP_URL'; // User will need to replace this

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

export async function submitOrder(orderData) {
    const response = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors', // Use no-cors for GAS if not using a specific header
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    });

    return response;
}

// PromptPay QR generation helper (simplified CRC16 calculation is complex, so we'll use a standard library pattern)
export function generatePromptPayQR(mobileOrTaxId, total) {
    // For this demonstration, we'll use a service or a simplified static QR link
    // Real implementation would use the promptpay-qr library logic
    // We'll use the API-based generator for better reliability in this standalone demo
    const amount = parseFloat(total).toFixed(2);
    return `https://promptpay.io/${mobileOrTaxId}/${amount}.png`;
}
