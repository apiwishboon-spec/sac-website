import { fetchNews } from '../news.js';
import { showAdminToast } from './utils.js';

export async function loadAdminNews() {
  const container = document.getElementById('admin-news-list');
  if (!container) return;

  // Skeleton loading
  container.innerHTML = Array(3).fill(
    '<div class="list-item" style="height:90px;" aria-hidden="true"><div class="skeleton" style="width:100%;height:80px;border-radius:10px;"></div></div>'
  ).join('');

  try {
    const news = await fetchNews();

    if (!news || news.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-muted);">No news articles found. Create your first one!</div>';
      return;
    }

    container.innerHTML = news.map(n => `
      <div class="list-item">
        <div style="display:flex;gap:1.25rem;align-items:center;min-width:0;">
          <img src="${n.thumbnail}" alt="${n.title}"
               style="width:90px;height:65px;object-fit:cover;border-radius:8px;flex-shrink:0;"
               onerror="this.style.display='none'">
          <div style="min-width:0;">
            <h4 style="margin:0 0 .3rem;font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${n.title}</h4>
            <div style="font-size:.82rem;color:var(--text-muted);display:flex;gap:1rem;flex-wrap:wrap;">
              <span>📅 ${new Date(n.date).toLocaleDateString('th-TH')}</span>
              <span>✍️ ${n.author}</span>
            </div>
          </div>
        </div>
        <div class="list-item-actions">
          <button class="btn-edit" onclick="adminEditNews('${n.id}')">✏️ Edit</button>
          <button class="btn-delete" onclick="adminDeleteNews('${n.id}')">🗑️</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = `<p style="color:#f87171;padding:2rem;">Error loading news: ${e.message}</p>`;
  }
}

// Global handlers for inline onclick attrs
window.adminEditNews = function (id) {
  showAdminToast('✏️ Edit news (backend not connected yet)');
};

window.adminDeleteNews = function (id) {
  if (confirm('Delete this news article?')) {
    showAdminToast('🗑️ Delete news (backend not connected yet)');
  }
};
