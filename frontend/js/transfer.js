/* =============================================
   transfer.js
   ============================================= */

if (!requireAuth()) throw new Error('Not authenticated');

populateSidebarUser();
document.getElementById('logout-btn').addEventListener('click', handleLogout);

let accounts      = [];
let fromBalance   = 0;
let currentStep   = 1;
let idempotencyKey = generateIdempotencyKey();

// ---- Pre-fill from URL param (?from=accountId) ----
const urlParams      = new URLSearchParams(window.location.search);
const preselectedFrom = urlParams.get('from');

// ============================================================
// Load accounts into the From dropdown
// ============================================================
async function loadAccounts() {
    const select = document.getElementById('from-account-select');
    try {
        const data = await api.accounts.getAll();
        accounts = (data.accounts || []).filter(a => a.status === 'ACTIVE');

        if (accounts.length === 0) {
            select.innerHTML = '<option value="">No active accounts found</option>';
            document.getElementById('next-btn').disabled = true;
            return;
        }

        select.innerHTML = accounts.map(acc =>
            `<option value="${acc._id}" ${acc._id === preselectedFrom ? 'selected' : ''}>
               ${truncateId(acc._id)} — ${acc.currency}
             </option>`
        ).join('');

        // Load balance for initially selected account
        await updateFromBalance();
    } catch (err) {
        select.innerHTML = '<option value="">Failed to load accounts</option>';
        showToast('Could not load accounts: ' + err.message, 'error');
    }
}

// ---- Update the balance display when from-account changes ----
async function updateFromBalance() {
    const accountId = document.getElementById('from-account-select').value;
    if (!accountId) return;

    const display  = document.getElementById('from-balance-display');
    const valueEl  = document.getElementById('from-balance-value');
    display.style.display = 'flex';
    valueEl.textContent = 'Loading…';

    try {
        const data = await api.accounts.getBalance(accountId);
        fromBalance = data.balance;
        valueEl.textContent = formatCurrency(fromBalance);
    } catch (err) {
        valueEl.textContent = 'Error';
    }
}

document.getElementById('from-account-select').addEventListener('change', updateFromBalance);

// ============================================================
// Step navigation
// ============================================================
function goToStep(n) {
    document.getElementById(`step-${currentStep}`).style.display = 'none';
    document.getElementById(`step-${n}`).style.display = 'block';

    // Update step indicators
    for (let i = 1; i <= 3; i++) {
        const ind = document.getElementById(`step-ind-${i}`);
        ind.classList.remove('active', 'done');
        if (i < n)  ind.classList.add('done');
        if (i === n) ind.classList.add('active');
    }
    // Update connector lines
    document.querySelectorAll('.t-step-line').forEach((line, idx) => {
        line.classList.toggle('done', idx + 1 < n);
    });

    currentStep = n;
}

// ---- Step 1 → 2: validate and show confirmation ----
document.getElementById('next-btn').addEventListener('click', () => {
    const fromId = document.getElementById('from-account-select').value;
    const toId   = document.getElementById('to-account-input').value.trim();
    const amount = parseFloat(document.getElementById('amount-input').value);
    const errEl  = document.getElementById('amount-error');

    errEl.style.display = 'none';

    if (!fromId) { showToast('Please select a source account.', 'error'); return; }
    if (!toId)   { showToast('Please enter a recipient account ID.', 'error'); return; }
    if (toId === fromId) { showToast('Cannot transfer to the same account.', 'error'); return; }
    if (!amount || amount <= 0) {
        errEl.textContent = '⚠️ Please enter a valid amount greater than 0.';
        errEl.style.display = 'flex'; return;
    }
    if (amount > fromBalance) {
        errEl.textContent = `⚠️ Insufficient balance. Available: ${formatCurrency(fromBalance)}`;
        errEl.style.display = 'flex'; return;
    }

    // Populate confirmation card
    idempotencyKey = generateIdempotencyKey();
    document.getElementById('confirm-amount').textContent  = formatCurrency(amount);
    document.getElementById('confirm-from').textContent    = truncateId(fromId);
    document.getElementById('confirm-to').textContent      = truncateId(toId);
    document.getElementById('confirm-balance-after').textContent = formatCurrency(fromBalance - amount);
    document.getElementById('confirm-idem-key').textContent = idempotencyKey;

    document.getElementById('transfer-error').style.display = 'none';
    goToStep(2);
});

// ---- Step 2 → 1: back ----
document.getElementById('back-btn').addEventListener('click', () => goToStep(1));

// ---- Step 2 → 3: send ----
document.getElementById('send-btn').addEventListener('click', async () => {
    const fromId = document.getElementById('from-account-select').value;
    const toId   = document.getElementById('to-account-input').value.trim();
    const amount = parseFloat(document.getElementById('amount-input').value);

    const btn    = document.getElementById('send-btn');
    btn.disabled = true;
    btn.querySelector('.btn-label').style.display   = 'none';
    btn.querySelector('.btn-loading').style.display = 'inline-flex';
    document.getElementById('transfer-error').style.display = 'none';

    try {
        await api.transactions.create(fromId, toId, amount, idempotencyKey);
        document.getElementById('success-amount').textContent = formatCurrency(amount);
        goToStep(3);
        showToast('Transfer successful! 🎉', 'success');
    } catch (err) {
        const errEl = document.getElementById('transfer-error');
        errEl.textContent = err.message;
        errEl.style.display = 'flex';
    } finally {
        btn.disabled = false;
        btn.querySelector('.btn-label').style.display   = 'inline-flex';
        btn.querySelector('.btn-loading').style.display = 'none';
    }
});

// ---- Reset for new transfer ----
function resetTransfer() {
    document.getElementById('to-account-input').value = '';
    document.getElementById('amount-input').value     = '';
    idempotencyKey = generateIdempotencyKey();
    goToStep(1);
    updateFromBalance();
}

// Init
loadAccounts();
