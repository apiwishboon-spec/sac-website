import { ADMIN_API, getAdminToken, showAdminToast } from './utils.js';
import { checkForNewOrders } from './auth.js';

// ─── Stats ──────────────────────────────────────────────────────────────────
export async function updateStats() {
  try {
    const res = await fetch(ADMIN_API, {
      method: 'POST',
      body: JSON.stringify({ action: 'getStats', token: getAdminToken() }),
    });
    const result = await res.json();

    if (result.result === 'success') {
      const d = result.data;
      setText('total-orders', d.completedOrders);
      setText('total-revenue', '฿' + parseFloat(d.totalRevenue).toLocaleString());
      setText('products-sold', Object.values(d.productsSold || {}).reduce((a, b) => a + b, 0));
      setText('new-customers', d.uniqueCustomers);
      setText('last-updated', 'Last updated: ' + new Date().toLocaleString('th-TH'));
      document.querySelectorAll('.stat-value').forEach(el => el.classList.remove('skeleton'));
    } else {
      showAdminToast('❌ Stats error: ' + result.error);
    }
  } catch (e) {
    showAdminToast('❌ Could not load stats.');
    console.error(e);
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ─── Charts ─────────────────────────────────────────────────────────────────
let barChart, donutChart;

export function initCharts() {
  const barCtx = document.getElementById('barChart')?.getContext('2d');
  const donutCtx = document.getElementById('donutChart')?.getContext('2d');
  if (!barCtx || !donutCtx) return;

  if (barChart) barChart.destroy();
  if (donutChart) donutChart.destroy();

  const chartColor = '#94a3b8';
  const gridColor = 'rgba(255,255,255,0.06)';

  barChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Orders',
        data: [4, 8, 5, 12, 9, 15],
        backgroundColor: 'rgba(14,165,233,0.45)',
        borderColor: 'rgba(14,165,233,0.9)',
        borderWidth: 2,
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: chartColor } } },
      scales: {
        y: { beginAtZero: true, ticks: { color: chartColor }, grid: { color: gridColor } },
        x: { ticks: { color: chartColor }, grid: { color: gridColor } },
      },
    },
  });

  donutChart = new Chart(donutCtx, {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Pending'],
      datasets: [{
        data: [65, 35],
        backgroundColor: ['rgba(16,185,129,0.75)', 'rgba(251,191,36,0.75)'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: { legend: { position: 'bottom', labels: { color: chartColor, padding: 20 } } },
    },
  });
}

// ─── Orders table ────────────────────────────────────────────────────────────
const tblStyle = `<style id="tbl-style">
  .orders-tbl{width:100%;border-collapse:collapse;font-size:.85rem;}
  .orders-tbl th{background:rgba(255,255,255,0.04);padding:10px 14px;text-align:left;font-weight:600;white-space:nowrap;border-bottom:2px solid var(--glass-border);color:var(--text-muted);font-size:0.78rem;text-transform:uppercase;letter-spacing:.5px;}
  .orders-tbl td{padding:12px 14px;border-bottom:1px solid var(--glass-border);vertical-align:middle;word-break:break-word;}
  .orders-tbl tr:hover td{background:rgba(255,255,255,0.025);}
  .btn-mark-done{background:#10b981;color:#fff;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-weight:600;white-space:nowrap;font-size:.8rem;transition:all .2s;}
  .btn-mark-done:hover{background:#059669;}
  .btn-mark-done:disabled{background:#6ee7b7;cursor:not-allowed;color:#fff;}
  .slip-link{color:var(--secondary);text-decoration:none;}
  .slip-link:hover{text-decoration:underline;}
</style>`;

export async function loadIncompleteOrders() {
  const panel = document.getElementById('orders-panel');
  if (!panel) return;
  panel.innerHTML = '<p style="color:var(--text-muted)">Loading…</p>';

  try {
    const res = await fetch(ADMIN_API, {
      method: 'POST',
      body: JSON.stringify({ action: 'getOrders', token: getAdminToken() }),
    });
    const result = await res.json();

    if (result.result === 'success') {
      const pending = result.data.orders.filter(o => String(o.status).toLowerCase() !== 'done');

      checkForNewOrders(pending);

      if (pending.length === 0) {
        panel.innerHTML = '<div style="text-align:center;padding:3rem;"><div style="font-size:3rem;">✅</div><p style="color:#4ade80;font-weight:600;margin-top:.5rem;">All orders completed!</p></div>';
        return;
      }

      let rows = pending.map((o, i) => {
        const slip = o.slipUrl
          ? `<a class="slip-link" href="${o.slipUrl}" target="_blank">View 📄</a>`
          : '—';
        return `<tr id="row-${o.rowIndex}">
          <td>${i + 1}</td>
          <td><code style="font-size:.8rem;opacity:.7">${o.orderId || '—'}</code></td>
          <td>${o.email || '—'}</td>
          <td>${o.phone || '—'}</td>
          <td><strong>${o.item || '—'}</strong></td>
          <td>${o.qty || '—'}</td>
          <td>${o.size || '—'}</td>
          <td><strong>฿${o.totalPrice || '—'}</strong></td>
          <td>${slip}</td>
          <td><span style="background:rgba(251,191,36,.15);color:#fbbf24;padding:3px 10px;border-radius:20px;font-size:.75rem;font-weight:600;">${o.status || 'Pending'}</span></td>
          <td><button class="btn-mark-done" onclick="markDone(${o.rowIndex}, this)">✅ Done</button></td>
        </tr>`;
      }).join('');

      panel.innerHTML = tblStyle + `
        <table class="orders-tbl">
          <thead><tr>
            <th>#</th><th>Order ID</th><th>Email</th><th>Phone</th>
            <th>Item</th><th>Qty</th><th>Size</th><th>Total</th>
            <th>Slip</th><th>Status</th><th>Action</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    } else {
      panel.innerHTML = `<p style="color:#f87171;">Error: ${result.error}</p>`;
    }
  } catch (e) {
    panel.innerHTML = `<p style="color:#f87171;">Network error: ${e.message}</p>`;
  }
}

export async function markDone(rowIndex, btn) {
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const res = await fetch(ADMIN_API, {
      method: 'POST',
      body: JSON.stringify({ action: 'markOrderDone', token: getAdminToken(), rowIndex }),
    });
    const result = await res.json();

    if (result.result === 'success') {
      const row = document.getElementById('row-' + rowIndex);
      if (row) { row.style.opacity = '0.35'; row.style.transition = 'opacity .5s'; }
      btn.textContent = '✓ Done';
      showAdminToast('✅ Order marked as done!');
    } else {
      btn.disabled = false;
      btn.textContent = '✅ Done';
      showAdminToast('❌ ' + result.error);
    }
  } catch (e) {
    btn.disabled = false;
    btn.textContent = '✅ Done';
    showAdminToast('❌ Network error');
  }
}

// ─── Stat Modal ──────────────────────────────────────────────────────────────
export async function openStatModal(type) {
  const overlay = document.getElementById('stat-modal-overlay');
  const title = document.getElementById('stat-modal-title');
  const body = document.getElementById('stat-modal-body');
  overlay.classList.add('open');
  title.textContent = '…';
  body.innerHTML = '<p style="color:var(--text-muted)">Loading…</p>';

  try {
    const res = await fetch(ADMIN_API, {
      method: 'POST',
      body: JSON.stringify({ action: 'getOrders', token: getAdminToken() }),
    });
    const result = await res.json();
    if (result.result !== 'success') throw new Error(result.error);

    const done = result.data.orders.filter(o => String(o.status).toLowerCase() === 'done');

    const tbl = (cols, rows) => tblStyle + `
      <table class="orders-tbl">
        <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${rows || `<tr><td colspan="${cols.length}" style="color:var(--text-muted);text-align:center;padding:2rem;">No data yet</td></tr>`}</tbody>
      </table>`;

    if (type === 'orders') {
      title.textContent = '✅ Completed Orders';
      body.innerHTML = tbl(
        ['Order ID', 'Email', 'Item', 'Size', 'Total'],
        done.map(o => `<tr><td><code>${o.orderId || '—'}</code></td><td>${o.email}</td><td>${o.item}</td><td>${o.size || '—'}</td><td>฿${o.totalPrice}</td></tr>`).join(''),
      );
    } else if (type === 'revenue') {
      title.textContent = '💳 Revenue Breakdown';
      body.innerHTML = tbl(
        ['Order ID', 'Customer', 'Item', 'Amount'],
        done.map(o => `<tr><td><code>${o.orderId || '—'}</code></td><td>${o.email}</td><td>${o.item}</td><td><strong>฿${o.totalPrice}</strong></td></tr>`).join(''),
      );
    } else if (type === 'products') {
      title.textContent = '📦 Products Sold';
      const counts = {};
      done.forEach(o => { counts[o.item] = (counts[o.item] || 0) + Number(o.qty || 1); });
      body.innerHTML = tbl(
        ['Product', 'Units Sold'],
        Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${k}</td><td><strong>${v}</strong></td></tr>`).join(''),
      );
    } else if (type === 'customers') {
      title.textContent = '👥 Unique Customers';
      const emails = [...new Set(done.map(o => o.email).filter(Boolean))];
      body.innerHTML = tbl(
        ['Email'],
        emails.map(e => `<tr><td>${e}</td></tr>`).join(''),
      );
    }
  } catch (e) {
    body.innerHTML = `<p style="color:#f87171;">Error: ${e.message}</p>`;
  }
}

export function closeStatModal() {
  document.getElementById('stat-modal-overlay').classList.remove('open');
}

// ─── Load dashboard ──────────────────────────────────────────────────────────
export async function loadDashboard() {
  await Promise.all([updateStats(), loadIncompleteOrders()]);
  initCharts();
}

export function refreshData() {
  showAdminToast('🔄 Refreshing…');
  loadDashboard();
}
