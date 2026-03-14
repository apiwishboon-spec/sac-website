// Author: Apiwish Anutaravanichkul
// Checkout functionality for Suankularb Astronomy Club website

import { cart } from './cart.js';

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwoFSAy3M8v3wI-HPeFYXwDo6AIhFCZN-iFBG0xYcVMDK1Poqb0B-luCnWLOtGFRqYWxQ/exec'; // Updated API URL

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
    try {
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'sendOTP', email })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('sendOTP result:', result);
        return result;
    } catch (error) {
        console.error('sendOTP error:', error);
        // Return error object for consistent handling
        return {
            result: 'error',
            error: error.message || 'Network error occurred'
        };
    }
}

export async function verifyOTP(email, otp) {
    try {
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'verifyOTP', email, otp })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('verifyOTP result:', result);
        return result;
    } catch (error) {
        console.error('verifyOTP error:', error);
        return {
            result: 'error',
            error: error.message || 'Network error occurred'
        };
    }
}

export async function submitOrder(orderData) {
    try {
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...orderData, action: 'submitOrder' })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('submitOrder result:', result);
        return result;
    } catch (error) {
        console.error('submitOrder error:', error);
        return {
            result: 'error',
            error: error.message || 'Network error occurred'
        };
    }
}

// PromptPay QR generation - now handled by Backend
export async function getPromptPayQR(amount) {
    const response = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getPaymentQR', amount })
    }).catch(err => {
        console.error('Fetch error:', err);
        throw new Error('Could not reach the payment server. Please check your internet or GAS deployment.');
    });

    if (!response.ok) {
        console.error('Server response error:', response.status);
        throw new Error('Payment server returned an error (' + response.status + ')');
    }

    const result = await response.json();
    if (result.result === 'error') {
        console.error('Backend logic error:', result.error);
        throw new Error(result.error);
    }

    return result.qrUrl;
}
