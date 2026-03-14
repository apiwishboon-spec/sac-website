// Author: Apiwish Anutaravanichkul
// Main JavaScript functionality for Suankularb Astronomy Club website

import { initNewsPreview } from './news.js';
import { initShopPreview } from './shop.js';
import { cart } from './cart.js';

// Loader utility functions
export function showLoader(message = 'Processing your order...') {
    // Remove any existing loader
    hideLoader();
    
    // Create loader overlay
    const loaderOverlay = document.createElement('div');
    loaderOverlay.className = 'loader-overlay';
    loaderOverlay.id = 'loader-overlay';
    
    // Create loader animation
    const loader = document.createElement('div');
    loader.className = 'lds-roller';
    loader.innerHTML = `
        <div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div>
    `;
    
    // Create loading text
    const loadingText = document.createElement('div');
    loadingText.className = 'loading-text';
    loadingText.textContent = message;
    
    loaderOverlay.appendChild(loader);
    loaderOverlay.appendChild(loadingText);
    document.body.appendChild(loaderOverlay);
    
    // Lock body
    document.body.classList.add('loading');
}

export function hideLoader() {
    const loaderOverlay = document.getElementById('loader-overlay');
    if (loaderOverlay) {
        loaderOverlay.remove();
    }
    document.body.classList.remove('loading');
}

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

    // Enhanced Mobile Menu Toggle with Touch Support
    const mobileToggle = document.querySelector('.mobile-nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    const body = document.body;

    // Create mobile overlay
    const mobileOverlay = document.createElement('div');
    mobileOverlay.className = 'mobile-nav-overlay';
    document.body.appendChild(mobileOverlay);

    // Touch support for mobile menu
    let touchStartY = 0;
    let touchEndY = 0;

    if (mobileToggle) {
        // Enhanced click with touch support
        mobileToggle.addEventListener('click', toggleMobileMenu);
        mobileToggle.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        mobileToggle.addEventListener('touchend', (e) => {
            touchEndY = e.changedTouches[0].clientY;
            // Only toggle if it's a tap (not a swipe)
            if (Math.abs(touchEndY - touchStartY) < 10) {
                e.preventDefault();
                toggleMobileMenu();
            }
        }, { passive: false });
    }

    function toggleMobileMenu() {
        const isActive = navLinks.classList.contains('active');
        
        // Toggle menu with enhanced animation
        navLinks.classList.toggle('active');
        mobileOverlay.classList.toggle('active');
        body.classList.toggle('mobile-menu-open');
        mobileToggle.classList.toggle('active');
        
        // Update icon with animation
        const icon = mobileToggle.querySelector('i');
        if (isActive) {
            icon.classList.add('fa-bars');
            icon.classList.remove('fa-times');
        } else {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        }

        // Add haptic feedback if available
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
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

    // Enhanced Sticky Nav effect with mobile optimization
    const nav = document.querySelector('nav');
    let lastScrollY = window.scrollY;
    let ticking = false;

    function updateNav() {
        const currentScrollY = window.scrollY;
        
        if (window.innerWidth <= 768) {
            // Mobile: Auto-hide/show on scroll
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                // Scrolling down - hide nav
                nav.style.transform = 'translateY(-100%)';
            } else {
                // Scrolling up - show nav
                nav.style.transform = 'translateY(0)';
            }
            
            // Adjust background opacity based on scroll
            const opacity = Math.min(0.95, 0.8 + (currentScrollY / 500));
            nav.style.background = `rgba(10, 11, 16, ${opacity})`;
        } else {
            // Desktop: Original behavior
            nav.style.transform = 'translateY(0)';
            if (currentScrollY > 50) {
                nav.style.height = '70px';
                nav.style.background = 'rgba(10, 11, 16, 0.95)';
            } else {
                nav.style.height = '80px';
                nav.style.background = 'rgba(10, 11, 16, 0.8)';
            }
        }
        
        lastScrollY = currentScrollY;
        ticking = false;
    }

    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateNav);
            ticking = true;
        }
    }

    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', () => {
        updateNav();
        // Close mobile menu on resize if switching to desktop
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

    // Enhanced mobile viewport handling
    function handleMobileViewport() {
        if (window.innerWidth <= 768) {
            // Set CSS custom property for mobile viewport height
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            
            // Prevent zoom on input focus (iOS)
            document.querySelectorAll('input, textarea, select').forEach(element => {
                element.addEventListener('focus', () => {
                    document.documentElement.style.setProperty('--zoom-level', '1');
                });
                element.addEventListener('blur', () => {
                    document.documentElement.style.setProperty('--zoom-level', '1');
                });
            });
        }
    }

    handleMobileViewport();
    window.addEventListener('resize', handleMobileViewport);
    window.addEventListener('orientationchange', handleMobileViewport);

    // Enhanced mobile touch interactions
    if (window.innerWidth <= 768) {
        // Add ripple effect to buttons
        document.querySelectorAll('.btn').forEach(button => {
            button.addEventListener('touchstart', function(e) {
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                this.appendChild(ripple);
                
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.touches[0].clientX - rect.left - size / 2;
                const y = e.touches[0].clientY - rect.top - size / 2;
                
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';
                
                setTimeout(() => ripple.remove(), 600);
            }, { passive: true });
        });

        // Enhanced scroll performance
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            document.body.classList.add('scrolling');
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                document.body.classList.remove('scrolling');
            }, 150);
        }, { passive: true });
    }
});
