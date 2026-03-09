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
        <article class="news-card" style="background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 16px; overflow: hidden; transition: var(--transition);">
            <div class="news-thumb" style="height: 200px; overflow: hidden;">
                <img src="${item.thumbnail}" alt="${item.title}" style="width: 100%; height: 100%; object-fit: cover; transition: var(--transition);" loading="lazy">
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
                <a href="news-detail.html?id=${item.id}" class="btn btn-outline" style="width: 100%; font-size: 0.9rem;">Read More</a>
            </div>
        </article>
    `;
}

export function initNewsPreview(containerId, limit = 3) {
    const container = document.getElementById(containerId);
    if (!container) return;

    fetchNews().then(news => {
        const previewNews = news.slice(0, limit);
        container.innerHTML = previewNews.map(item => renderNewsItem(item)).join('');
    });
}
