import { initAdminTabs } from './tabs.js';
import { attemptAdminLogin, cancelLogin, logout, requestNotificationPermission } from './auth.js';
import {
  loadDashboard, refreshData, markOrderDone, updateStatus, deleteOrderPermanently,
  loadIncompleteOrders, openStatModal, closeStatModal, startAutoRefresh, stopAutoRefresh,
} from './dashboard.js';
import { getAdminToken } from './utils.js';

// Expose to global scope for HTML onclick= attributes
window.attemptAdminLogin = attemptAdminLogin;
window.cancelLogin = cancelLogin;
window.logout = logout;
window.refreshData = refreshData;
window.markOrderDone = markOrderDone;
window.updateStatus = updateStatus;
window.deleteOrderPermanently = deleteOrderPermanently;
window.loadIncompleteOrders = loadIncompleteOrders;
window.openStatModal = openStatModal;
window.closeStatModal = closeStatModal;
window.startAutoRefresh = startAutoRefresh;
window.stopAutoRefresh = stopAutoRefresh;

document.addEventListener('DOMContentLoaded', () => {
  initAdminTabs();

  document.getElementById('pw-input')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') attemptAdminLogin();
  });

  const token = getAdminToken();
  if (token) {
    document.getElementById('login-wall').style.display = 'none';
    document.getElementById('admin-layout').style.display = 'block';

    // Check for notification permission immediately on startup
    requestNotificationPermission();

    // Initial load
    loadDashboard();

    // Start auto-polling for new orders every 60 seconds
    setInterval(() => {
      console.log('🔄 Checking for new orders...');
      loadIncompleteOrders();
    }, 60000);
  }
});
