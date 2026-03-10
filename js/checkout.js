import { cart } from './cart.js';

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyVB6KZbhWLdP_qb0F68fTFWZp3aX1CsWUC3A9Z9-ax9vh_WZbkFaJES7cgwxSMuDa5/exec'; // User provided URL

export async function uploadToImgBB(file) {
    const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });

    const response = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'uploadImage', base64Image: base64 })
    });

    if (!response.ok) throw new Error('Slip upload failed');

    const result = await response.json();
    if (result.result === 'error') throw new Error(result.error);

    return result.url;
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

// PromptPay QR generation - now handled by Backend
export async function getPromptPayQR(amount) {
    const response = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getPaymentQR', amount })
    });

    if (!response.ok) throw new Error('Failed to generate payment QR');

    const result = await response.json();
    if (result.result === 'error') throw new Error(result.error);

    return result.qrUrl;
}
