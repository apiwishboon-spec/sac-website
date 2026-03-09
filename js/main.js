import { initNewsPreview } from './news.js';
import { initShopPreview } from './shop.js';
import { cart } from './cart.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Preview Sections if they exist
    const newsGrid = document.getElementById('news-preview-grid');
    if (newsGrid) initNewsPreview('news-preview-grid', 3);

    const shopGrid = document.getElementById('product-preview-grid');
    if (shopGrid) initShopPreview('product-preview-grid', 4);

    // Smooth Scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Sticky Nav effect
    const nav = document.querySelector('nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.style.height = '70px';
            nav.style.background = 'rgba(10, 11, 16, 0.95)';
        } else {
            nav.style.height = '80px';
            nav.style.background = 'rgba(10, 11, 16, 0.8)';
        }
    });
});
