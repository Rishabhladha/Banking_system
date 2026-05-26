/* =============================================
   auth.js — Login / Register Logic
   ============================================= */

// Redirect if already authenticated
redirectIfLoggedIn('dashboard.html');

// ---- Tab switching ----
function switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');

    const loginForm    = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');

    if (tab === 'login') {
        loginForm.style.display    = 'block';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display    = 'none';
        registerForm.style.display = 'block';
    }
    // Clear errors on switch
    document.getElementById('login-error').style.display   = 'none';
    document.getElementById('reg-error').style.display     = 'none';
}

// Check URL hash for #register deep link
if (window.location.hash === '#register') switchTab('register');

// ---- Show/hide password ----
function togglePw(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon  = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'ri-eye-line';
    } else {
        input.type = 'password';
        icon.className = 'ri-eye-off-line';
    }
}

// ---- Password strength ----
document.getElementById('reg-password')?.addEventListener('input', function () {
    const val = this.value;
    const strengthDiv = document.getElementById('pw-strength');
    const fill        = document.getElementById('pw-fill');
    const label       = document.getElementById('pw-label');

    if (!val) { strengthDiv.style.display = 'none'; return; }
    strengthDiv.style.display = 'block';

    let score = 0;
    if (val.length >= 6)  score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val))  score++;
    if (/[0-9]/.test(val))  score++;
    if (/[^a-zA-Z0-9]/.test(val)) score++;

    const levels = [
        { pct:'20%',  color:'var(--red)',          text:'Very weak' },
        { pct:'40%',  color:'#f97316',             text:'Weak' },
        { pct:'60%',  color:'var(--gold)',          text:'Fair' },
        { pct:'80%',  color:'var(--cyan)',          text:'Strong' },
        { pct:'100%', color:'var(--green)',         text:'Very strong' },
    ];
    const lvl   = levels[Math.min(score, 4)];
    fill.style.width      = lvl.pct;
    fill.style.background = lvl.color;
    label.textContent     = lvl.text;
    label.style.color     = lvl.color;
});

// ---- Helper: set loading state on button ----
function setLoading(btnId, isLoading) {
    const btn = document.getElementById(btnId);
    btn.disabled = isLoading;
    btn.querySelector('.btn-label').style.display   = isLoading ? 'none'  : 'inline-flex';
    btn.querySelector('.btn-loading').style.display = isLoading ? 'inline-flex' : 'none';
}

// ---- Helper: show inline error ----
function showFormError(id, message) {
    const el = document.getElementById(id);
    el.textContent = message;
    el.style.display = 'flex';
}

// ========== LOGIN ==========
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showFormError('login-error', 'Please fill in all fields.');
        return;
    }

    document.getElementById('login-error').style.display = 'none';
    setLoading('login-btn', true);

    try {
        const data = await api.auth.login(email, password);
        Auth.setToken(data.token);
        Auth.setUser(data.user);
        showToast('Welcome back, ' + data.user.name + '! 👋', 'success');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
    } catch (err) {
        showFormError('login-error', err.message);
    } finally {
        setLoading('login-btn', false);
    }
});

// ========== REGISTER ==========
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    if (!name || !email || !password) {
        showFormError('reg-error', 'Please fill in all fields.');
        return;
    }
    if (password.length < 6) {
        showFormError('reg-error', 'Password must be at least 6 characters.');
        return;
    }

    document.getElementById('reg-error').style.display = 'none';
    setLoading('reg-btn', true);

    try {
        const data = await api.auth.register(name, email, password);
        Auth.setToken(data.token);
        Auth.setUser(data.user);
        showToast('Account created! Welcome, ' + data.user.name + ' 🎉', 'success');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);
    } catch (err) {
        showFormError('reg-error', err.message);
    } finally {
        setLoading('reg-btn', false);
    }
});
