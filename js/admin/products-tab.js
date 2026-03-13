import { fetchProducts } from '../shop.js';
import { showAdminToast } from './utils.js';

export async function loadAdminProducts() {
  const container = document.getElementById('admin-products-list');
  if (!container) return;

  container.innerHTML = Array(3).fill(
    '<div class="list-item" style="height:90px;" aria-hidden="true"><div class="skeleton" style="width:100%;height:80px;border-radius:10px;"></div></div>'
  ).join('');

  try {
    const products = await fetchProducts();

    if (!products || products.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-muted);">No products found. Add your first product!</div>';
      return;
    }

    container.innerHTML = products.map(p => `
      <div class="list-item">
        <div style="display:flex;gap:1.25rem;align-items:center;min-width:0;">
          <img src="${p.image}" alt="${p.name}"
               style="width:70px;height:70px;object-fit:cover;border-radius:10px;flex-shrink:0;"
               onerror="this.style.display='none'">
          <div style="min-width:0;">
            <h4 style="margin:0 0 .3rem;font-size:1rem;">${p.name}</h4>
            <div style="font-size:.85rem;color:var(--text-muted);display:flex;gap:1.25rem;flex-wrap:wrap;">
              <span style="color:var(--secondary);font-weight:700;">฿${p.price}</span>
              <span>Stock: <strong style="color:${p.stock > 0 ? '#4ade80' : '#f87171'}">${p.stock}</strong></span>
              ${p.sizes ? `<span>Sizes: ${p.sizes.join(', ')}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="list-item-actions">
          <button class="btn-edit" onclick="adminEditProduct('${p.id}')">✏️ Edit</button>
          <button class="btn-delete" onclick="adminDeleteProduct('${p.id}')">🗑️</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = `<p style="color:#f87171;padding:2rem;">Error loading products: ${e.message}</p>`;
  }
}

window.adminEditProduct = function (id) {
  showAdminToast('✏️ Edit product (backend not connected yet)');
};

window.adminDeleteProduct = function (id) {
  if (confirm('Delete this product?')) {
    showAdminToast('🗑️ Delete product (backend not connected yet)');
  }
};
