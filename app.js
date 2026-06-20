const CONFIG = {
    APP_ID: "33BtkERTtsYkUV2i6IaEm",
    WS_URL: "wss://ws.derivws.com/websockets/v3"
};

const botState = {
    isRunning: false,
    status: "WAITING_FOR_SIGNAL",
    baseStake: 1.00,
    currentStake: 1.00,
    currentBarrier: 4,
    totalLossesInSeries: 0,
    targetProfit: 100.00,
    stopLoss: 1000.00,

    syncUiParameters: function() {
        const lblBarrier = document.getElementById('lbl-barrier');
        const lblStake = document.getElementById('lbl-stake');
        if (lblBarrier) lblBarrier.innerText = `Under ${this.currentBarrier}`;
        if (lblStake) lblStake.innerText = `$${this.currentStake.toFixed(2)}`;
    }
};

// --- DOM FLOATING CUSTOMER SUPPORT WIDGET OVERLAY INTERACTION ---
const supportToggleBtn = document.getElementById('support-toggle-btn');
const supportDropdown = document.getElementById('support-dropdown');
if (supportToggleBtn && supportDropdown) {
    supportToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        supportDropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => {
        supportDropdown.classList.remove('open');
    });
}

// --- DOM MOBILE APPLICATION TABS NAVIGATION SYSTEM SYSTEM ---
document.querySelectorAll('.tab-link').forEach(tabElement => {
    tabElement.addEventListener('click', () => {
        document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        tabElement.classList.add('active');
        const targetId = tabElement.getAttribute('data-target');
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) targetPanel.classList.add('active');
    });
});

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');

// --- EXPLICIT PRODUCTION CALLBACK REDIRECT ROUTING PATH MATRIX ---
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        const callbackDomain = `${window.location.origin}/callback`;
        const oauthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${CONFIG.APP_ID}&redirect_uri=${encodeURIComponent(callbackDomain)}`;
        window.location.href = oauthUrl;
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = window.location.origin;
    });
}

// --- CORE HANDSHAKE OAUTH TOKEN EXTRACTION MODULE ---
function parseOauthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token1');
    const acct = urlParams.get('acct1');

    if (token) {
        localStorage.setItem('deriv_token', token);
        if (acct) localStorage.setItem('deriv_acct', acct);
        window.history.replaceState({}, document.title, window.location.origin);
    }
}

function initSession() {
    parseOauthCallback();
    
    const activeToken = localStorage.getItem('deriv_token');

    if (!activeToken) {
        if (authSection) authSection.classList.remove('hidden');
        if (dashboardSection) dashboardSection.classList.add('hidden');
        return;
    }

    const ws = new WebSocket(`${CONFIG.WS_URL}?app_id=${CONFIG.APP_ID}`);

    ws.onopen = () => {
        const statusText = document.getElementById('telemetry-status-text');
        if (statusText) statusText.innerText = "Syncing system data matrices...";
        ws.send(JSON.stringify({ authorize: activeToken }));
    };

    ws.onmessage = (event) => {
        const response = JSON.parse(event.data);

        if (response.msg_type === 'authorize') {
            if (response.error) {
                localStorage.clear();
                alert("Session synchronization severed: " + response.error.message);
                window.location.href = window.location.origin;
            } else {
                if (authSection) authSection.classList.add('hidden');
                if (dashboardSection) dashboardSection.classList.remove('hidden');
                
                if (document.getElementById('acc-id')) document.getElementById('acc-id').innerText = `Account: ${response.authorize.loginid}`;
                if (document.getElementById('acc-balance')) document.getElementById('acc-balance').innerText = parseFloat(response.authorize.balance).toFixed(2);
                if (document.getElementById('acc-currency')) document.getElementById('acc-currency').innerText = response.authorize.currency;
                
                const statusText = document.getElementById('telemetry-status-text');
                if (statusText) statusText.innerText = "WebSocket Telemetry Streams Aggregation Nominal";
                
                botState.syncUiParameters();
            }
        }
    };

    ws.onerror = (error) => {
        console.error("WebSocket Pipeline Error:", error);
    };
}

initSession();
            
