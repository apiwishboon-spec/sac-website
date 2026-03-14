// Author: Apiwish Anutaravanichkul
// Admin authentication for Suankularb Astronomy Club website

import { getAdminToken, showAdminToast } from './utils.js';
import { loadDashboard } from './dashboard.js';

let previousOrderIds = new Set();
let notificationsReady = false;

export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        showAdminToast('❌ Your browser doesn\'t support notifications');
        return;
    }

    if (Notification.permission === 'granted') {
        notificationsReady = true;
        showAdminToast('🔔 Order notifications are active!');
    } else if (Notification.permission !== 'denied') {
        // Create custom permission request UI
        const permissionDialog = document.createElement('div');
        permissionDialog.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: var(--bg-card); border: 1px solid var(--glass-border);
            border-radius: 12px; padding: 2rem; z-index: 10000;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            text-align: center; min-width: 350px;
        `;
        
        permissionDialog.innerHTML = `
            <h3 style="margin-bottom: 1rem; color: var(--secondary);">🔔 Enable Order Notifications</h3>
            <p style="margin-bottom: 1.5rem; color: var(--text-muted);">
                Get instant alerts when customers place orders!<br>
                <strong>Benefits:</strong><br>
                • Real-time order alerts<br>
                • Customer details & total amount<br>
                • Quick access to order management<br>
                • Vibration alerts on mobile
            </p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button id="allow-notifications" style="background: var(--secondary); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    ✅ Enable Notifications
                </button>
                <button id="deny-notifications" style="background: transparent; color: var(--text-muted); border: 1px solid var(--glass-border); padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer;">
                    Maybe Later
                </button>
            </div>
        `;
        
        document.body.appendChild(permissionDialog);
        
        return new Promise((resolve) => {
            const allowBtn = document.getElementById('allow-notifications');
            const denyBtn = document.getElementById('deny-notifications');
            
            const cleanup = () => {
                document.body.removeChild(permissionDialog);
                allowBtn.onclick = null;
                denyBtn.onclick = null;
            };
            
            allowBtn.onclick = async () => {
                cleanup();
                try {
                    const perm = await Notification.requestPermission();
                    notificationsReady = (perm === 'granted');
                    if (notificationsReady) {
                        showAdminToast('🎉 Order notifications enabled successfully!');
                    } else {
                        showAdminToast('⚠️ Notification permission denied');
                    }
                } catch (error) {
                    showAdminToast('❌ Failed to enable notifications');
                }
                resolve();
            };
            
            denyBtn.onclick = () => {
                cleanup();
                showAdminToast('ℹ️ Notifications disabled. You can enable them later in settings.');
                resolve();
            };
            
            // Auto-close after 30 seconds
            setTimeout(cleanup, 30000);
        });
    } else {
        showAdminToast('ℹ️ Notifications are blocked. Please enable them in browser settings.');
    }
}

export function showOrderNotification(newOrders) {
    if (!notificationsReady) return;
    
    newOrders.forEach((o, i) => {
        setTimeout(() => {
            // Create enhanced notification with more details
            const notification = new Notification('🛍️ New SAC Order!', {
                body: `${o.name || 'Customer'} ordered ${o.itemCount || 'items'}\n💰 Total: ฿${o.totalPrice}\n📍 ${o.address || 'Delivery available'}\n📧 ${o.email}`,
                icon: 'images/favicon.ico',
                tag: `order-${o.orderId || o.rowIndex}`,
                requireInteraction: true,
                silent: false,
                badge: newOrders.length.toString(),
                vibrate: [200, 100, 200], // Vibration pattern
                timestamp: Date.now()
            });
            
            // Enhanced click handler with more options
            notification.onclick = () => {
                window.focus();
                notification.close();
                
                // Show quick action dialog
                const action = confirm(`New Order Alert:\n\nCustomer: ${o.name || 'Unknown'}\nEmail: ${o.email}\nTotal: ฿${o.totalPrice}\n\nClick OK to view orders, or Cancel to dismiss`);
                if (action) {
                    document.getElementById('orders-nav-link')?.click();
                }
            };
            
            // Auto-close after 10 seconds
            setTimeout(() => {
                if (notification.close) {
                    notification.close();
                }
            }, 10000);
            
        }, i * 500); // Faster staggered notifications
    });
    
    // Show summary toast for multiple orders
    if (newOrders.length > 1) {
        setTimeout(() => {
            showAdminToast(`🔔 ${newOrders.length} new orders received! Total: ฿${newOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0)}`);
        }, newOrders.length * 500 + 1000);
    }
}

export function checkForNewOrders(currentOrders) {
    // Use orderId if available, otherwise fallback to rowIndex + timestamp hash
    const currentIds = new Set(currentOrders.map(o => o.orderId || `row-${o.rowIndex}-${o.timestamp}`).filter(Boolean));

    if (previousOrderIds.size > 0) {
        const newIds = [...currentIds].filter(id => !previousOrderIds.has(id));
        if (newIds.length > 0) {
            const newOrders = currentOrders.filter(o => newIds.includes(o.orderId || `row-${o.rowIndex}-${o.timestamp}`));
            showOrderNotification(newOrders);
            showAdminToast(newOrders.length === 1
                ? `🔔 New order from ${newOrders[0].name || newOrders[0].email}`
                : `🔔 ${newOrders.length} new orders!`);
        }
    }

    previousOrderIds = currentIds;

    // Update pending badge
    const badge = document.getElementById('pending-badge');
    if (badge) {
        if (currentOrders.length > 0) {
            badge.textContent = currentOrders.length;
            badge.style.display = 'inline-block';
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
        errorEl.textContent = 'Incorrect password.';
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
    window.location.reload(); // Hard reload to clear all states
}
