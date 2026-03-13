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
    const body = document.body;

    // Create mobile overlay
    const mobileOverlay = document.createElement('div');
    mobileOverlay.className = 'mobile-nav-overlay';
    document.body.appendChild(mobileOverlay);

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            const isActive = navLinks.classList.contains('active');
            
            // Toggle menu
            navLinks.classList.toggle('active');
            mobileOverlay.classList.toggle('active');
            body.classList.toggle('mobile-menu-open');
            mobileToggle.classList.toggle('active');
            
            // Update icon
            const icon = mobileToggle.querySelector('i');
            if (isActive) {
                icon.classList.add('fa-bars');
                icon.classList.remove('fa-times');
            } else {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            }
        });
    }

    // Close mobile menu when clicking overlay
    mobileOverlay.addEventListener('click', () => {
        closeMobileMenu();
    });

    // Close mobile menu when clicking a link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            closeMobileMenu();
        });
    });

    // Close mobile menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navLinks.classList.contains('active')) {
            closeMobileMenu();
        }
    });

    // Close mobile menu on window resize (if switching to desktop)
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && navLinks.classList.contains('active')) {
            closeMobileMenu();
        }
    });

    function closeMobileMenu() {
        navLinks.classList.remove('active');
        mobileOverlay.classList.remove('active');
        body.classList.remove('mobile-menu-open');
        if (mobileToggle) {
            mobileToggle.classList.remove('active');
            const icon = mobileToggle.querySelector('i');
            icon.classList.add('fa-bars');
            icon.classList.remove('fa-times');
        }
    }

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
