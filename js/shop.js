/**
 * Shop functionality for Suankularb Astronomy Club
 * Author: Apiwish Anutaravanichkul
 */

import { cart } from './cart.js';

export async function fetchProducts() {
    try {
        const response = await fetch('data/products.json');
        return await response.json();
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

export function renderProductItem(product) {
    return `
        <div class="product-card" style="background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 16px; padding: 1.5rem; text-align: center; transition: var(--transition);">
            <div class="product-img" style="min-height: 180px; margin-bottom: 1.5rem; overflow: hidden; border-radius: 8px;">
                <img src="${product.image}" alt="${product.name}" style="width: 100%; height: auto; object-fit: contain; transition: var(--transition);">
            </div>
            <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">${product.name}</h3>
            <p style="color: var(--secondary); font-weight: 700; font-size: 1.25rem; margin-bottom: 1rem;">฿${product.price}</p>
            <button class="btn btn-primary add-to-cart" data-id="${product.id}" style="width: 100%; font-size: 0.9rem;">
                <i class="fas fa-cart-plus"></i> Add to Cart
            </button>
        </div>
    `;
}

export function initShopPreview(containerId, limit = 4) {
    console.log('initShopPreview called with:', containerId, limit);
    const container = document.getElementById(containerId);
    console.log('Container found:', container);
    if (!container) return;

    fetchProducts().then(products => {
        console.log('Products data fetched:', products);
        const previewProducts = products.slice(0, limit);
        console.log('Preview products:', previewProducts);
        const renderedHTML = previewProducts.map(p => renderProductItem(p)).join('');
        console.log('Rendered HTML:', renderedHTML.substring(0, 200) + '...');
        container.innerHTML = renderedHTML;
        console.log('Container innerHTML set. New content length:', container.innerHTML.length);

        // Add event listeners
        container.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;
                const product = products.find(p => p.id === id);
                if (product) cart.add(product);
            };
        });
    }).catch(error => {
        console.error('Error fetching products:', error);
    });
}
