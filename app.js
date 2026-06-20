// Platform Configuration
const CONFIG = {
    APP_ID: "33BtkERTtsYkUV2i6IaEm",
    WS_URL: "wss://ws.derivws.com/websockets/v3" // Raw official base URL
};

// Global Bot Strategy & Risk Management Matrix
const botState = {
    isRunning: false,
    status: "WAITING_FOR_SIGNAL", // WAITING_FOR_SIGNAL, EXECUTING, RECOVERING
    baseStake: 1.00,
    currentStake: 1.00,
    currentBarrier: 4,            // Starts at Under 4
    totalLossesInSeries: 0,
    targetProfit: 100.00,
    stopLoss: 1000.00,

    // Sync state-machine data variables directly with index UI layouts
    syncUiParameters: function() {
        const lblBarrier = document.getElementById('lbl-barrier');
        const lblStake = document.getElementById('lbl-stake');
        if (lblBarrier) lblBarrier.innerText = `Under ${this.currentBarrier}`;
        if (lblStake) lblStake.innerText = `$${this.currentStake.toFixed(2)}`;
    },

    // Adaptive logic matrix when a trade finishes
    handleTradeResult: function(wasWin, lostAmount, winAmount) {
        if (wasWin) {
            console.log(`%c [WIN] Profit Secured: +$${winAmount}. Resetting parameters.`, 'color: #28a745; font-weight: bold;');
            this.status = "WAITING_FOR_SIGNAL";
            this.currentBarrier = 4;
            this.currentStake = this.baseStake;
            this.totalLossesInSeries = 0;
        } else {
            this.totalLossesInSeries += lostAmount;
            console.log(`%c [LOSS] Series Deficit: -$${this.totalLossesInSeries}. Adapting to Under 3.`, 'color: #dc3545; font-weight: bold;');
            
            this.status = "RECOVERING";
            this.currentBarrier = 3; // Shift down to higher payout ratio barrier
            
            // Dynamic recovery stake calculation formula (Under 3 payout ~1.44x multiplier)
            const expectedMultiplier = 1.44; 
            this.currentStake = parseFloat((this.totalLossesInSeries / expectedMultiplier).toFixed(2));
            
            // Hard safety boundary
            if (this.totalLossesInSeries >= this.stopLoss) {
                console.error("Hard Stop-Loss breached! Killing automated systems execution.");
                this.isRunning = false;
            }
        }
        this.syncUiParameters();
    }
};

// --- DOM NAVIGATION INTERACTION INTERFACE HANDLERS ---
document.querySelectorAll('.tab-link').forEach(tabElement => {
    tabElement.addEventListener('click', () => {
        // Clear active classes from sibling tab targets
        document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        
        // Append active status context targets
        tabElement.classList.add('active');
        const targetId = tabElement.getAttribute('data-target');
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) targetPanel.classList.add('active');
    });
});

// DOM Node Declarations
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const tokenInput = document.getElementById('token-input');
const tokenSubmitBtn = document.getElementById('token-submit-btn');
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');

// --- ROUTE A: One-Click OAuth Generation ---
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        // Dynamic detection handles Vercel hosting addresses out-of-the-box
        const currentDomain = window.location.origin;
        const oauthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${CONFIG.APP_ID}&redirect_uri=${encodeURIComponent(currentDomain)}`;
        window.location.href = oauthUrl;
    });
}

// --- ROUTE B: Tech-Savvy Token Submission ---
if (tokenSubmitBtn) {
    tokenSubmitBtn.addEventListener('click', () => {
        const rawToken = tokenInput.value.trim();
        if (!rawToken) {
            alert("Please paste an authorized API Token first.");
            return;
        }
        localStorage.setItem('deriv_token', rawToken);
        window.location.reload(); // Hard reload triggers clean initialization
    });
}

// --- SESSION TEARDOWN ---
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = window.location.pathname; // Reload clear state
    });
}

// --- OAUTH REDIRECT PARSER ---
function parseOauthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token1');
    const acct = urlParams.get('acct1');

    if (token) {
        localStorage.setItem('deriv_token', token);
        if (acct) localStorage.setItem('deriv_acct', acct);
        
        // Sanitize browser URL string bar to preserve aesthetic layout
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// --- CORE HANDSHAKE STREAM ROUTER ---
function initSession() {
    parseOauthCallback();
    
    const activeToken = localStorage.getItem('deriv_token');

    if (!activeToken) {
        if (authSection) authSection.classList.remove('hidden');
        if (dashboardSection) dashboardSection.classList.add('hidden');
        return;
    }

    // Connect via standard parameters mapping structure
    const ws = new WebSocket(`${CONFIG.WS_URL}?app_id=${CONFIG.APP_ID}`);

    ws.onopen = () => {
        const statusText = document.getElementById('telemetry-status-text');
        if (statusText) statusText.innerText = "Connecting secure channel API endpoints...";
        console.log("WebSocket engine linked. Authenticating token authorizations...");
        ws.send(JSON.stringify({ authorize: activeToken }));
    };

    ws.onmessage = (event) => {
        const response = JSON.parse(event.data);

        // Process Authorization Status Reply
        if (response.msg_type === 'authorize') {
            if (response.error) {
                console.error("Authorization Failure Response:", response.error.message);
                localStorage.clear();
                alert("Session linkage broken: " + response.error.message);
                window.location.reload();
            } else {
                console.log("Session Successfully Instantiated!", response.authorize);
                
                // Swap Interface Cards
                if (authSection) authSection.classList.add('hidden');
                if (dashboardSection) dashboardSection.classList.remove('hidden');
                
                // Print Account Info Identically to Production Platform Looks
                if (document.getElementById('acc-id')) document.getElementById('acc-id').innerText = `Account: ${response.authorize.loginid}`;
                if (document.getElementById('acc-balance')) document.getElementById('acc-balance').innerText = parseFloat(response.authorize.balance).toFixed(2);
                if (document.getElementById('acc-currency')) document.getElementById('acc-currency').innerText = response.authorize.currency;
                
                const statusText = document.getElementById('telemetry-status-text');
                if (statusText) statusText.innerText = "WebSocket Telemetry Aggregation Nominal";
                
                // Update internal states
                botState.syncUiParameters();
                
                // Trigger live market telemetry trackers
                startMarketListener(ws);
            }
        }
        
        // Pass stream responses down to the data processing matrix
        handleIncomingStreams(response);
    };

    ws.onerror = (error) => {
        console.error("Critical WebSocket Network Error:", error);
        const statusText = document.getElementById('telemetry-status-text');
        const statusDot = document.getElementById('telemetry-dot');
        if (statusText) statusText.innerText = "Pipeline Severed (Error)";
        if (statusDot) statusDot.style.background = "#f04438";
    };
    
    ws.onclose = () => console.log("WebSocket socket connection closed cleanly.");
}

// --- TELEMETRY SUB-SYSTEM ---
function startMarketListener(ws) {
    console.log("Subscribing to Volatility 100 (1S) Index ticker...");
    ws.send(JSON.stringify({ ticks: "R_100" }));
}

// --- PIPELINE DATA PARSER ---
function handleIncomingStreams(response) {
    if (response.msg_type === 'tick') {
        const tickData = response.tick;
        if (tickData) {
            // Unmask target last digits for indicator cross checking
            const lastDigit = parseInt(tickData.quote.toString().slice(-1));
            
            // Your bot calculation loops check this variable continuously
        }
    }
}

// Instantiate App Loop
initSession();
