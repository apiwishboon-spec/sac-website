import { initAdminTabs } from './tabs.js';
import { attemptAdminLogin, cancelLogin, logout } from './auth.js';
import {
  loadDashboard, refreshData, markDone,
  loadIncompleteOrders, openStatModal, closeStatModal,
} from './dashboard.js';
import { getAdminToken } from './utils.js';

// Expose to global scope for HTML onclick= attributes
window.attemptAdminLogin = attemptAdminLogin;
window.cancelLogin = cancelLogin;
window.logout = logout;
window.refreshData = refreshData;
window.markDone = markDone;
window.loadIncompleteOrders = loadIncompleteOrders;
window.openStatModal = openStatModal;
window.closeStatModal = closeStatModal;
window.openNewsForm = () => import('./news-tab.js');   // placeholder
window.openProductForm = () => import('./products-tab.js'); // placeholder

document.addEventListener('DOMContentLoaded', () => {
  // Set up tab navigation
  initAdminTabs();

  // Handle Enter key in password field
  document.getElementById('pw-input')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') attemptAdminLogin();
  });

  // Auto-login if token already exists
  const token = getAdminToken();
  if (token) {
    document.getElementById('login-wall').style.display = 'none';
    document.getElementById('admin-layout').style.display = 'block';
    loadDashboard();
  }
});
