// Author: Apiwish Anutaravanichkul
// Shop functionality for Suankularb Astronomy Club website

import { cart } from './cart.js';

export async function fetchProducts() {
    try {
        // Try multiple possible paths for the products.json file
        const possiblePaths = [
            './data/products.json',
            'data/products.json',
            '/data/products.json'
        ];
        
        let response = null;
        let lastError = null;
        
        for (const path of possiblePaths) {
            try {
                response = await fetch(path);
                if (response.ok) {
                    console.log(`Successfully fetched products from: ${path}`);
                    const products = await response.json();
                    console.log('Products loaded:', products.length);
                    return products;
                }
            } catch (error) {
                console.log(`Failed to fetch from ${path}:`, error);
                lastError = error;
            }
        }
        
        // If all paths fail, throw the last error
        throw lastError || new Error('Failed to fetch products from all paths');
        
    } catch (error) {
        console.error('Error fetching products:', error);
        
        // Return fallback products if fetch fails
        console.log('Using fallback products');
        return [
            {
                id: "shirt_repeat_2022",
                name: "เสื้อยืด SAC Repeat 2022",
                price: 200,
                image: "https://i.postimg.cc/6QLTwrB9/Screenshot-2569-03-14-at-14-36-20.png",
                description: "เสื้อยืดที่แข็งแกร่งที่สุดในปฐพี เนื้อผ้า Cotton เกรดพรีเมียม สกรีนลายดาราศาสตร์สวนกุหลาบ",
                stock: 100
            },
            {
                id: "mask_sac",
                name: "หน้ากากอนามัย SAC Mask",
                price: 40,
                image: "https://i.postimg.cc/YC5rtKH1/image.png",
                description: "หน้ากากผ้า SAC ลายลิมิเต็ด สีน้ำเงิน-ชมพู พร้อมสายคล้อง",
                stock: 50
            },
            {
                id: "keychain_moon",
                name: "พวงกุญแจดวงจันทร์ (Moon Keychain)",
                price: 60,
                image: "https://i.postimg.cc/J4yC06KZ/image.png",
                description: "พวงกุญแจลายพื้นผิวดวงจันทร์ สวยงาม ทนทาน สำหรับชาวดาราศาสตร์",
                stock: 30
            }
        ];
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
    const container = document.getElementById(containerId);
    if (!container) return;

    fetchProducts().then(products => {
        const previewProducts = products.slice(0, limit);
        container.innerHTML = previewProducts.map(p => renderProductItem(p)).join('');

        // Add event listeners
        container.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;
                const product = products.find(p => p.id === id);
                if (product) cart.add(product);
            };
        });
    });
}
