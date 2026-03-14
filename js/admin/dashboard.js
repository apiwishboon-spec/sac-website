/**
 * Admin dashboard functionality for Suankularb Astronomy Club
 * Author: Apiwish Anutaravanichkul
 */

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

export async function initCharts() {
  const barCtx = document.getElementById('barChart')?.getContext('2d');
  const donutCtx = document.getElementById('donutChart')?.getContext('2d');
  if (!barCtx || !donutCtx) return;

  try {
    const res = await fetch(ADMIN_API, {
      method: 'POST',
      body: JSON.stringify({ action: 'getOrders', token: getAdminToken() }),
    });
    const result = await res.json();
    if (result.result !== 'success') throw new Error(result.error);

    const allOrders = result.data.orders;

    // Process Bar Chart (Monthly Orders)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = new Array(12).fill(0);
    allOrders.forEach(o => {
      if (!o.timestamp) return;
      const date = new Date(o.timestamp);
      if (!isNaN(date.getTime())) {
        monthlyData[date.getMonth()]++;
      }
    });

    // Process Donut Chart (Status Breakdown)
    const statusCounts = { 'Pending': 0, 'Shipping': 0, 'Ready': 0, 'Done': 0 };
    allOrders.forEach(o => {
      const s = o.status || 'Pending';
      if (statusCounts.hasOwnProperty(s)) {
        statusCounts[s]++;
      } else {
        statusCounts['Pending']++;
      }
    });

    if (barChart) barChart.destroy();
    if (donutChart) donutChart.destroy();

    const chartColor = '#94a3b8';
    const gridColor = 'rgba(255,255,255,0.06)';

    barChart = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          label: 'Orders',
          data: monthlyData,
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
          y: { beginAtZero: true, ticks: { color: chartColor, stepSize: 1 }, grid: { color: gridColor } },
          x: { ticks: { color: chartColor }, grid: { color: gridColor } },
        },
      },
    });

    donutChart = new Chart(donutCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(statusCounts),
        datasets: [{
          data: Object.values(statusCounts),
          backgroundColor: [
            'rgba(251, 191, 36, 0.75)', // Pending (Yellow)
            'rgba(59, 130, 246, 0.75)',  // Shipping (Blue)
            'rgba(139, 92, 246, 0.75)', // Ready (Purple)
            'rgba(16, 185, 129, 0.75)'   // Done (Green)
          ],
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
  } catch (e) {
    console.error('Chart Load Error:', e);
  }
}

// ─── Orders table ────────────────────────────────────────────────────────────
const tblStyle = `<style id="tbl-style">
  .orders-tbl{width:100%;border-collapse:collapse;font-size:.85rem;}
  .orders-tbl th{background:rgba(255,255,255,0.04);padding:10px 14px;text-align:left;font-weight:600;white-space:nowrap;border-bottom:2px solid var(--glass-border);color:var(--text-muted);font-size:0.78rem;text-transform:uppercase;letter-spacing:.5px;}
  .orders-tbl td{padding:12px 14px;border-bottom:1px solid var(--glass-border);vertical-align:middle;word-break:break-word;}
  .orders-tbl tr:hover td{background:rgba(255,255,255,0.025);}
  .order-actions{display:flex;gap:0.4rem;flex-wrap:wrap;}
  .btn-status{padding:6px 8px;border-radius:6px;border:1px solid var(--glass-border);background:rgba(0,0,0,0.2);color:var(--text-main);cursor:pointer;font-size:0.75rem;font-weight:600;transition:all 0.2s;}
  .btn-status:hover{background:rgba(255,255,255,0.1);}
  .btn-pending:hover{border-color:#fbbf24;color:#fbbf24;}
  .btn-shipping:hover{border-color:#3b82f6;color:#3b82f6;}
  .btn-ready:hover{border-color:#10b981;color:#10b981;}
  .btn-done:hover{border-color:#a855f7;color:#a855f7;}
  .btn-delete-row:hover{border-color:#ef4444;color:#ef4444;background:rgba(239,68,68,0.1);}
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
      const allOrders = result.data.orders;
      const filtered = allOrders.filter(o => {
        const s = String(o.status || 'Pending').toLowerCase().trim();
        return s !== 'done';
      });

      checkForNewOrders(filtered);

      if (filtered.length === 0) {
        panel.innerHTML = '<div style="text-align:center;padding:3rem;"><div style="font-size:3rem;">✅</div><p style="color:#4ade80;font-weight:600;margin-top:.5rem;">All orders completed!</p></div>';
        return;
      }

      let rows = filtered.map((o, i) => {
        const slip = o.slipUrl
          ? `<a class="slip-link" href="${o.slipUrl}" target="_blank">View 📄</a>`
          : '—';

        let statusColor = '#fbbf24';
        if (o.status === 'Shipping') statusColor = '#3b82f6';
        if (o.status === 'Ready') statusColor = '#10b981';

        const rowTime = o.timestamp ? new Date(o.timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '—';

        return `<tr id="row-${o.rowIndex}">
          <td>${i + 1}</td>
          <td><code style="font-size:.8rem;opacity:.7">${rowTime}</code></td>
          <td>${o.name || '—'}<br><small style="color:var(--text-muted)">${o.email || ''}</small></td>
          <td>${o.phone || '—'}</td>
          <td><div style="max-width:200px;font-size:0.75rem;color:var(--text-muted);word-wrap:break-word">${o.cart || '—'}</div></td>
          <td><strong>฿${o.totalPrice || '—'}</strong></td>
          <td>${slip}</td>
          <td><span style="background:rgba(255,255,255,0.05);color:${statusColor};padding:3px 10px;border-radius:20px;font-size:.75rem;font-weight:700;border:1px solid ${statusColor}44;">${o.status || 'Pending'}</span></td>
          <td>
            <div class="order-actions">
              <button class="btn-status btn-pending" title="Set Pending" onclick="updateStatus(${o.rowIndex}, 'Pending', this)">⏳ Pnd</button>
              <button class="btn-status btn-shipping" title="Set Shipping" onclick="updateStatus(${o.rowIndex}, 'Shipping', this)">🚚 Shp</button>
              <button class="btn-status btn-ready" title="Set Ready" onclick="updateStatus(${o.rowIndex}, 'Ready', this)">✅ Rdy</button>
              <button class="btn-status btn-done" title="Move to History" onclick="markOrderDone(${o.rowIndex}, this)">💜 Done</button>
              <button class="btn-status btn-delete-row" title="PERMANENTLY DELETE" onclick="deleteOrderPermanently(${o.rowIndex}, this)">🗑️ Del</button>
            </div>
          </td>
        </tr>`;
      }).join('');

      panel.innerHTML = tblStyle + `
        <table class="orders-tbl">
          <thead><tr>
            <th>#</th><th>Time</th><th>Customer</th><th>Phone</th>
            <th>Items</th><th>Total</th>
            <th>Slip</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    } else {
      panel.innerHTML = `<p style="color:#f87171;">Error: ${result.error}</p>`;
    }
  } catch (e) {
    console.error('Fetch Error:', e);
    panel.innerHTML = `<p style="color:#f87171;">Network error: ${e.message}<br><small>Check console for details.</small></p>`;
  }
}

export async function updateStatus(rowIndex, status, btn) {
  const originalText = btn.textContent;
  btn.textContent = '…';
  btn.disabled = true;

  try {
    const res = await fetch(ADMIN_API, {
      method: 'POST',
      body: JSON.stringify({
        action: 'updateOrderStatus',
        token: getAdminToken(),
        rowIndex: rowIndex,
        status: status
      }),
    });
    const result = await res.json();

    if (result.result === 'success') {
      showAdminToast(`✅ Status updated to: ${status}`);
      loadIncompleteOrders();
      initCharts();
    } else {
      showAdminToast('❌ ' + result.error);
      btn.disabled = false;
      btn.textContent = originalText;
    }
  } catch (e) {
    showAdminToast('❌ Network error');
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

export async function markOrderDone(rowIndex, btn) {
  if (!confirm('Mark as completely done? It will be HIDDEN from this view but kept in database.')) return;

  btn.disabled = true;
  btn.textContent = '…';

  try {
    const res = await fetch(ADMIN_API, {
      method: 'POST',
      body: JSON.stringify({ action: 'markOrderDone', token: getAdminToken(), rowIndex }),
    });
    const result = await res.json();

    if (result.result === 'success') {
      showAdminToast('✅ Order moved to History');
      loadIncompleteOrders();
      initCharts();
    } else {
      btn.disabled = false;
      btn.textContent = '💜 Done';
      showAdminToast('❌ ' + result.error);
    }
  } catch (e) {
    btn.disabled = false;
    btn.textContent = '💜 Done';
    showAdminToast('❌ Network error');
  }
}

export async function deleteOrderPermanently(rowIndex, btn) {
  if (!confirm('⚠️ PERMANENT DELETE\n\nAre you sure you want to PERMANENTLY delete this order from the database? This cannot be undone.')) return;

  const originalText = btn.textContent;
  btn.textContent = '…';
  btn.disabled = true;

  try {
    const res = await fetch(ADMIN_API, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteOrder', token: getAdminToken(), rowIndex }),
    });
    const result = await res.json();

    if (result.result === 'success') {
      showAdminToast('🗑️ Order deleted from database');
      loadIncompleteOrders();
      initCharts();
      updateStats();
    } else {
      showAdminToast('❌ ' + result.error);
      btn.disabled = false;
      btn.textContent = originalText;
    }
  } catch (e) {
    showAdminToast('❌ Network error');
    btn.disabled = false;
    btn.textContent = originalText;
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
        ['Time', 'Email', 'Items', 'Total'],
        done.map(o => `<tr><td><code>${o.timestamp ? new Date(o.timestamp).toLocaleDateString() : '—'}</code></td><td>${o.email}</td><td>${o.cart}</td><td>฿${o.totalPrice}</td></tr>`).join(''),
      );
    } else if (type === 'revenue') {
      title.textContent = '💳 Revenue Breakdown';
      body.innerHTML = tbl(
        ['Time', 'Customer', 'Amount'],
        done.map(o => `<tr><td><code>${o.timestamp ? new Date(o.timestamp).toLocaleDateString() : '—'}</code></td><td>${o.email}</td><td><strong>฿${o.totalPrice}</strong></td></tr>`).join(''),
      );
    } else if (type === 'products') {
      title.textContent = '📦 Popular Selection';
      body.innerHTML = '<p style="color:var(--text-muted)">Aggregation data coming from dashboard stats.</p>';
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
