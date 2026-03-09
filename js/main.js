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

    // Mobile Menu Toggle
    const mobileToggle = document.querySelector('.mobile-nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = mobileToggle.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        });
    }

    // Close mobile menu when clicking a link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            if (mobileToggle) {
                const icon = mobileToggle.querySelector('i');
                icon.classList.add('fa-bars');
                icon.classList.remove('fa-times');
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
