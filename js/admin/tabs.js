import { loadDashboard } from './dashboard.js';
import { loadAdminNews } from './news-tab.js';
import { loadAdminProducts } from './products-tab.js';

export function initAdminTabs() {
    const navLinks = document.querySelectorAll('#main-nav a[data-target]');
    const panes = document.querySelectorAll('.tab-pane');

    navLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();

            navLinks.forEach(l => l.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));

            link.classList.add('active');
            const pane = document.getElementById(link.dataset.target);
            if (pane) pane.classList.add('active');

            // Lazy-load data per tab
            const target = link.dataset.target;
            if (target === 'dashboard-pane') loadDashboard();
            if (target === 'news-pane') loadAdminNews();
            if (target === 'products-pane') loadAdminProducts();
        });
    });
}
