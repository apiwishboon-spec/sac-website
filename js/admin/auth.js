import { getAdminToken, showAdminToast } from './utils.js';
import { loadDashboard } from './dashboard.js';

let previousOrderIds = new Set();
let notificationsReady = false;

async function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        notificationsReady = (perm === 'granted');
        if (notificationsReady) showAdminToast('🔔 Order notifications enabled!');
    } else {
        notificationsReady = (Notification.permission === 'granted');
    }
}

export function showOrderNotification(newOrders) {
    if (!notificationsReady) return;
    newOrders.forEach((o, i) => {
        setTimeout(() => {
            const n = new Notification('🛍️ New Order!', {
                body: `${o.item} – ฿${o.totalPrice}\nFrom: ${o.email}`,
                icon: 'images/favicon.ico',
                tag: `order-${o.orderId}`,
            });
            n.onclick = () => {
                window.focus();
                n.close();
                document.querySelector('[data-target="orders-pane"]')?.click();
            };
        }, i * 800);
    });
}

export function checkForNewOrders(currentOrders) {
    const currentIds = new Set(currentOrders.map(o => o.orderId).filter(Boolean));
    if (previousOrderIds.size > 0) {
        const newIds = [...currentIds].filter(id => !previousOrderIds.has(id));
        if (newIds.length > 0) {
            const newOrders = currentOrders.filter(o => newIds.includes(o.orderId));
            showOrderNotification(newOrders);
            showAdminToast(newOrders.length === 1
                ? `🔔 New order from ${newOrders[0].email}`
                : `🔔 ${newOrders.length} new orders!`);
        }
    }
    previousOrderIds = currentIds;

    // Update pending badge
    const badge = document.getElementById('pending-badge');
    if (badge) {
        if (currentOrders.length > 0) {
            badge.textContent = currentOrders.length;
            badge.style.display = 'inline';
        } else {
            badge.style.display = 'none';
        }
    }
}

export function attemptAdminLogin() {
    const pwInput = document.getElementById('pw-input');
    const errorEl = document.getElementById('login-error');
    const pw = pwInput.value;

    errorEl.textContent = '';

    if (!pw) {
        errorEl.textContent = 'Please enter a password.';
        return;
    }

    if (pw === 'sacadmin2026') {
        const token = 'sac_admin_token_' + Date.now();
        localStorage.setItem('adminToken', token);
        sessionStorage.setItem('adminToken', token);

        document.getElementById('login-wall').style.display = 'none';
        document.getElementById('admin-layout').style.display = 'block';
        showAdminToast('🎉 Welcome back!');
        requestNotificationPermission();
        loadDashboard();
    } else {
        errorEl.textContent = 'Incorrect password. Please try again.';
        pwInput.value = '';
        pwInput.focus();
    }
}

export function cancelLogin() {
    window.location.href = 'index.html';
}

export function logout() {
    localStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminToken');
    document.getElementById('admin-layout').style.display = 'none';
    document.getElementById('login-wall').style.display = 'flex';
    document.getElementById('pw-input').value = '';
    showAdminToast('👋 Logged out.');
}
