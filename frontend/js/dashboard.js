/* =============================================
   dashboard.js
   ============================================= */

if (!requireAuth()) throw new Error('Not authenticated');

populateSidebarUser();
document.getElementById('logout-btn').addEventListener('click', handleLogout);

const user = Auth.getUser();
document.getElementById('header-greeting').textContent =
    `Welcome back, ${user?.name || 'User'} — here's your financial overview`;

let accounts = [];

// ============================================================
// Load dashboard data
// ============================================================
async function loadDashboard() {
    try {
        const data = await api.accounts.getAll();
        accounts = data.accounts || [];
        renderStats();
        await renderAccounts();
    } catch (err) {
        showToast('Failed to load accounts: ' + err.message, 'error');
        renderAccountsEmpty();
    }
}

// ---- Render summary stat cards ----
function renderStats() {
    const grid = document.getElementById('stats-grid');
    const count    = accounts.length;
    const active   = accounts.filter(a => a.status === 'ACTIVE').length;

    grid.innerHTML = `
      <div class="stat-card glass-card">
        <div class="stat-icon" style="background:rgba(124,58,237,.15);color:var(--purple-light);">
          <i class="ri-bank-card-fill"></i>
        </div>
        <div class="stat-label">Total Accounts</div>
        <div class="stat-value">${count}</div>
        <div class="stat-sub">${active} active</div>
      </div>
      <div class="stat-card glass-card" id="total-balance-card">
        <div class="stat-icon" style="background:rgba(245,158,11,.12);color:var(--gold);">
          <i class="ri-money-dollar-circle-fill"></i>
        </div>
        <div class="stat-label">Total Balance</div>
        <div class="stat-value" id="total-balance-value" style="font-size:24px;">Loading…</div>
        <div class="stat-sub">Across all accounts</div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon" style="background:rgba(16,185,129,.12);color:var(--green);">
          <i class="ri-shield-check-fill"></i>
        </div>
        <div class="stat-label">Account Status</div>
        <div class="stat-value" style="font-size:22px;">${active > 0 ? '✓ Active' : '—'}</div>
        <div class="stat-sub">${active} of ${count} active</div>
      </div>
    `;
}

// ---- Render account cards ----
async function renderAccounts() {
    const grid = document.getElementById('accounts-grid');

    if (accounts.length === 0) {
        renderAccountsEmpty();
        return;
    }

    // Show skeleton
    grid.innerHTML = accounts.map(() => `
      <div class="account-card glass-card">
        <div class="skeleton" style="height:14px;width:80px;margin-bottom:16px;"></div>
        <div class="skeleton" style="height:32px;width:150px;margin-bottom:20px;"></div>
        <div class="skeleton" style="height:12px;width:60px;"></div>
      </div>`).join('');

    // Fetch all balances in parallel
    const balanceResults = await Promise.allSettled(
        accounts.map(a => api.accounts.getBalance(a._id))
    );

    // Compute total
    let total = 0;
    balanceResults.forEach(r => { if (r.status === 'fulfilled') total += r.value.balance; });
    const totalEl = document.getElementById('total-balance-value');
    if (totalEl) totalEl.textContent = formatCurrency(total);

    // Render cards
    grid.innerHTML = accounts.map((acc, i) => {
        const result  = balanceResults[i];
        const balance = result.status === 'fulfilled' ? result.value.balance : null;
        const statusBadge = acc.status === 'ACTIVE'
            ? '<span class="badge badge-active">● Active</span>'
            : `<span class="badge badge-frozen">${acc.status}</span>`;

        return `
          <div class="account-card glass-card" data-id="${acc._id}">
            <div class="account-card-glow"></div>
            <div class="ac-header">
              <div class="ac-id">ID: ${truncateId(acc._id)}</div>
              ${statusBadge}
            </div>
            <div class="ac-balance-label">Available Balance</div>
            <div class="ac-balance ${balance === null ? 'loading' : ''}">
              ${balance !== null ? formatCurrency(balance, acc.currency) : 'Fetching…'}
            </div>
            <div class="ac-footer">
              <span class="ac-currency">Currency: ${acc.currency}</span>
              <div class="ac-actions">
                <button class="btn btn-outline btn-sm" onclick="copyId('${acc._id}')" title="Copy Account ID">
                  <i class="ri-file-copy-line"></i>
                </button>
                <a href="transactions.html?account=${acc._id}" class="btn btn-ghost btn-sm" title="View transactions">
                  <i class="ri-history-line"></i>
                </a>
                <a href="transfer.html?from=${acc._id}" class="btn btn-primary btn-sm" title="Send money">
                  <i class="ri-send-plane-fill"></i>
                </a>
              </div>
            </div>
          </div>`;
    }).join('');
}

function renderAccountsEmpty() {
    document.getElementById('accounts-grid').innerHTML = `
      <div class="no-accounts">
        <div class="no-accounts-icon">🏦</div>
        <div class="section-title-sm" style="margin-bottom:8px;">No accounts yet</div>
        <p class="text-secondary" style="margin-bottom:20px;font-size:14px;">
          Create your first bank account to start making transfers.
        </p>
        <button class="btn btn-primary" onclick="openCreateModal()">
          <i class="ri-add-line"></i> Create Account
        </button>
      </div>`;
}

// ---- Copy account ID ----
function copyId(id) {
    navigator.clipboard.writeText(id).then(() => showToast('Account ID copied!', 'info'));
}

// ---- Create account modal ----
function openCreateModal() {
    document.getElementById('modal-create').style.display = 'flex';
}
function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

document.getElementById('create-account-btn').addEventListener('click', openCreateModal);
document.getElementById('qa-create-account').addEventListener('click', openCreateModal);

// Close modal on overlay click
document.getElementById('modal-create').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal('modal-create');
});

document.getElementById('confirm-create-btn').addEventListener('click', async () => {
    const btn = document.getElementById('confirm-create-btn');
    btn.disabled = true;
    btn.querySelector('.btn-label').style.display   = 'none';
    btn.querySelector('.btn-loading').style.display = 'inline-flex';

    try {
        await api.accounts.create();
        showToast('New account created successfully! 🎉', 'success');
        closeModal('modal-create');
        loadDashboard();
    } catch (err) {
        showToast('Failed to create account: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.querySelector('.btn-label').style.display   = 'inline-flex';
        btn.querySelector('.btn-loading').style.display = 'none';
    }
});

// Kick off
loadDashboard();
