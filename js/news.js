/**
 * News functionality for Suankularb Astronomy Club
 * Author: Apiwish Anutaravanichkul
 */

export async function fetchNews() {
    try {
        const response = await fetch('data/news.json');
        const data = await response.json();
        return data.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.error('Error fetching news:', error);
        return [];
    }
}

export function renderNewsItem(item) {
    return `
        <article class="news-card" data-id="${item.id}" style="background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 16px; overflow: hidden; transition: var(--transition);">
            <div class="news-thumb" style="min-height: 200px; overflow: hidden; cursor: pointer;">
                <img src="${item.thumbnail}" alt="${item.title}" style="width: 100%; height: auto; object-fit: contain; transition: var(--transition);" loading="lazy">
            </div>
            <div class="news-content" style="padding: 1.5rem;">
                <div class="news-meta" style="display: flex; gap: 1rem; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">
                    <span><i class="far fa-calendar"></i> ${new Date(item.date).toLocaleDateString()}</span>
                    <span><i class="far fa-user"></i> ${item.author}</span>
                </div>
                <h3 style="margin-bottom: 1rem; font-size: 1.25rem;">${item.title}</h3>
                <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1.5rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${item.content}
                </p>
                <div class="news-tags" style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem;">
                    ${item.tags.map(tag => `<span class="tag" style="background: rgba(79, 70, 229, 0.1); color: var(--primary); padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">#${tag}</span>`).join('')}
                </div>
                <button class="btn btn-outline read-more-btn" data-id="${item.id}" style="width: 100%; font-size: 0.9rem;">Read More</button>
            </div>
        </article>
    `;
}

export function openNewsModal(item) {
    let modal = document.getElementById('news-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'news-modal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close">&times;</button>
            <img src="${item.thumbnail}" style="width: 100%; height: auto; object-fit: contain; border-radius: 12px; margin-bottom: 1.5rem;">
            <div class="news-meta" style="margin-bottom: 1rem; color: var(--text-muted);">
                <span>${new Date(item.date).toLocaleDateString()}</span> | <span>${item.author}</span>
            </div>
            <h2 style="margin-bottom: 1.5rem;">${item.title}</h2>
            <div style="color: var(--text-muted); line-height: 1.8;">${item.content}</div>
        </div>
    `;

    modal.style.display = 'flex';
    modal.querySelector('.modal-close').onclick = () => modal.style.display = 'none';
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
}

export function initNewsEvents(container, newsData) {
    container.querySelectorAll('.read-more-btn, .news-thumb').forEach(el => {
        el.onclick = () => {
            const id = el.dataset.id || el.closest('.news-card').dataset.id;
            const item = newsData.find(n => n.id === id);
            if (item) openNewsModal(item);
        };
    });
}

export function initNewsPreview(containerId, limit = 3) {
    console.log('initNewsPreview called with:', containerId, limit);
    const container = document.getElementById(containerId);
    console.log('Container found:', container);
    if (!container) return;

    fetchNews().then(news => {
        console.log('News data fetched:', news);
        const previewNews = news.slice(0, limit);
        console.log('Preview news:', previewNews);
        container.innerHTML = previewNews.map(item => renderNewsItem(item)).join('');
        initNewsEvents(container, news);
    }).catch(error => {
        console.error('Error fetching news:', error);
    });
}
