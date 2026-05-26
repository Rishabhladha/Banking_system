/* =============================================
   transactions.js
   ============================================= */

if (!requireAuth()) throw new Error('Not authenticated');

populateSidebarUser();
document.getElementById('logout-btn').addEventListener('click', handleLogout);

let allTransactions = [];
let currentAccountId = null;
let currentFilter    = 'all';

// Pre-select from URL param (?account=id)
const urlParams    = new URLSearchParams(window.location.search);
const preAccountId = urlParams.get('account');

// ============================================================
// Load accounts into dropdown
// ============================================================
async function loadAccountSelector() {
    const select = document.getElementById('account-select');
    try {
        const data = await api.accounts.getAll();
        const accounts = data.accounts || [];

        if (accounts.length === 0) {
            select.innerHTML = '<option value="">No accounts found</option>';
            return;
        }

        select.innerHTML = `<option value="">— Choose an account —</option>` +
            accounts.map(a =>
                `<option value="${a._id}" ${a._id === preAccountId ? 'selected' : ''}>
                   ${truncateId(a._id)} &nbsp;|&nbsp; ${a.currency} &nbsp;|&nbsp; ${a.status}
                 </option>`
            ).join('');

        // Auto-load if pre-selected
        if (preAccountId) {
            await loadTransactions(preAccountId);
        }
    } catch (err) {
        select.innerHTML = '<option value="">Failed to load</option>';
        showToast('Could not load accounts: ' + err.message, 'error');
    }
}

document.getElementById('account-select').addEventListener('change', async function () {
    const id = this.value;
    if (!id) {
        document.getElementById('tx-list').innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="ri-bank-card-2-line"></i></div>
            <div class="empty-state-title">Select an account</div>
            <p class="text-muted" style="font-size:14px;">Choose an account above to view its transactions.</p>
          </div>`;
        document.getElementById('tx-summary').style.display  = 'none';
        document.getElementById('tx-filter-bar').style.display = 'none';
        return;
    }
    await loadTransactions(id);
});

// ============================================================
// Load and display transactions
// ============================================================
async function loadTransactions(accountId) {
    currentAccountId = accountId;
    const listEl = document.getElementById('tx-list');

    // Show skeleton
    listEl.innerHTML = `
      <div class="tx-list-wrapper">
        ${[...Array(4)].map(() => `
          <div class="tx-skeleton">
            <div class="skeleton" style="width:44px;height:44px;border-radius:50%;flex-shrink:0;"></div>
            <div style="flex:1;">
              <div class="skeleton" style="height:14px;width:140px;margin-bottom:8px;"></div>
              <div class="skeleton" style="height:11px;width:200px;"></div>
            </div>
            <div style="text-align:right;">
              <div class="skeleton" style="height:16px;width:80px;margin-bottom:8px;margin-left:auto;"></div>
              <div class="skeleton" style="height:11px;width:60px;margin-left:auto;"></div>
            </div>
          </div>`).join('')}
      </div>`;

    try {
        const data = await api.transactions.getHistory(accountId);
        allTransactions = data.transactions || [];
        renderTransactionList();
        renderSummary(accountId);
        document.getElementById('tx-filter-bar').style.display = 'flex';
        document.getElementById('tx-summary').style.display = 'flex';
    } catch (err) {
        listEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="ri-error-warning-line"></i></div>
            <div class="empty-state-title">Failed to load</div>
            <p class="text-muted" style="font-size:14px;">${err.message}</p>
          </div>`;
        showToast('Failed to load transactions: ' + err.message, 'error');
    }
}

// ---- Render the filtered list ----
function renderTransactionList() {
    const listEl = document.getElementById('tx-list');

    const filtered = currentFilter === 'all'
        ? allTransactions
        : allTransactions.filter(t => t.status === currentFilter);

    if (filtered.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="ri-file-list-3-line"></i></div>
            <div class="empty-state-title">No transactions found</div>
            <p class="text-muted" style="font-size:14px;">
              ${currentFilter === 'all' ? 'No transactions on this account yet.' : `No ${currentFilter.toLowerCase()} transactions.`}
            </p>
          </div>`;
        return;
    }

    const items = filtered.map((tx, i) => {
        const isCredit = tx.toAccount === currentAccountId;
        const dir      = isCredit ? 'credit' : 'debit';
        const dirIcon  = isCredit ? 'ri-arrow-down-line' : 'ri-arrow-up-line';
        const dirLabel = isCredit ? 'Received' : 'Sent';
        const prefix   = isCredit ? '+' : '-';

        const statusBadge = `<span class="badge badge-${tx.status.toLowerCase()}">${tx.status}</span>`;
        const otherParty  = isCredit
            ? `From: ${truncateId(tx.fromAccount)}`
            : `To: ${truncateId(tx.toAccount)}`;

        return `
          <div class="tx-item" style="animation-delay:${i * 0.04}s;">
            <div class="tx-direction-icon ${dir}">
              <i class="${dirIcon}"></i>
            </div>
            <div class="tx-info">
              <div class="tx-type">${dirLabel} &nbsp; ${statusBadge}</div>
              <div class="tx-meta tx-monospace">${otherParty}</div>
            </div>
            <div class="tx-right">
              <div class="tx-amount ${dir}">${prefix}${formatCurrency(tx.amount)}</div>
              <div class="tx-date">${formatDate(tx.createdAt)}</div>
            </div>
          </div>`;
    }).join('');

    listEl.innerHTML = `<div class="tx-list-wrapper">${items}</div>`;
}

// ---- Render summary totals ----
function renderSummary(accountId) {
    let totalIn  = 0;
    let totalOut = 0;
    allTransactions.forEach(tx => {
        if (tx.toAccount === accountId)   totalIn  += tx.amount;
        else                              totalOut += tx.amount;
    });
    document.getElementById('total-in').textContent  = formatCurrency(totalIn);
    document.getElementById('total-out').textContent = formatCurrency(totalOut);
    document.getElementById('tx-count').textContent  = allTransactions.length;
}

// ---- Filter handler ----
function setFilter(filter, btn) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTransactionList();
}

// Init
loadAccountSelector();
