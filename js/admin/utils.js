export const ADMIN_API = "https://script.google.com/macros/s/AKfycbylfYCN8xOIfM8rgXeiG5ipQkzXIzwMZvb4CM26hMl9OZoU0oOzdvuYZ2A-FaJgyKHfYg/exec";

export function getAdminToken() {
    return localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken') || '';
}

export function showAdminToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3500);
}
