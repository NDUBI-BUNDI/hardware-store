/**
 * Hardware Store Admin - Main Application
 * DASHEL Enterprise
 */

const API_BASE_URL = 'http://localhost:8080/backend/api.php';

// ============ UTILITY FUNCTIONS ============

/**
 * Show alert message
 */
function showAlert(message, type = 'success') {
    const alertContainer = document.getElementById('alert-container');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" class="close">&times;</button>
    `;
    alertContainer.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

/**
 * Export currently-loaded analytics as CSV
 */
function exportAnalyticsCSV() {
    const data = window.__salesAnalytics || [];
    if (!data || data.length === 0) {
        showAlert('No analytics data loaded to export.', 'error');
        return;
    }

    const header = ['period','sales_total','cost_total','profit'];
    const rows = data.map(d => [
        `"${String(d.period).replace(/"/g,'""')}"`,
        d.sales_total ?? 0,
        d.cost_total ?? 0,
        d.profit ?? 0
    ].join(','));

    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const gran = localStorage.getItem('analytics_granularity') || 'monthly';
    const from = document.getElementById('analytics-from')?.value || '';
    const to = document.getElementById('analytics-to')?.value || '';
    const fileName = `analytics_${gran}${from || ''}${to ? '_' + to : ''}.csv`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showAlert('CSV exported.', 'success');
}

/**
 * Format currency
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 2
    }).format(value);
}

/**
 * Format date
 */
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-KE');
}

/**
 * API Call Handler
 */
async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(`${API_BASE_URL}?endpoint=${endpoint}`, options);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || result.message || 'An error occurred');
        }
        
        return result.data || result;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        showAlert(error.message, 'error');
        throw error;
    }
}

/**
 * Show tab
 */
function showTab(tabName) {
    // Hide all tabs
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.classList.remove('active'));
    
    // Remove active class from all buttons
    const tabButtons = document.querySelectorAll('.tab');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Load data for the tab
    if (tabName === 'dashboard') {
        loadDashboard();
    } else if (tabName === 'sales') {
        loadSales();
    } else if (tabName === 'inventory') {
        loadInventory();
    } else if (tabName === 'suppliers') {
        loadSuppliers();
    } else if (tabName === 'mpesa') {
        loadStkHistory();
    }
}

// ============ DASHBOARD ============

async function loadDashboard() {
    try {
        const data = await apiCall('dashboard');
        
        document.getElementById('total-sales').textContent = formatCurrency(data.totalSales || 0);
        document.getElementById('total-profit').textContent = formatCurrency(data.profit || 0);
        document.getElementById('inventory-value').textContent = formatCurrency(data.totalInventoryValue || 0);
        document.getElementById('low-stock').textContent = data.lowStockItems || 0;
        document.getElementById('total-products').textContent = data.totalProducts || 0;
        document.getElementById('total-suppliers').textContent = data.totalSuppliers || 0;
        
        // Load recent sales
        const tbody = document.getElementById('recent-sales-table');
        tbody.innerHTML = '';
        
        if (data.recentSales && data.recentSales.length > 0) {
            data.recentSales.forEach(sale => {
                tbody.innerHTML += `
                    <tr>
                        <td>${sale.product_name}</td>
                        <td>${sale.quantity}</td>
                        <td>${formatCurrency(sale.unit_price)}</td>
                        <td>${formatCurrency(sale.total_price)}</td>
                        <td>${formatDate(sale.sale_date)}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No sales yet</td></tr>';
        }

        // keep analytics ready for graph mode
        try {
            // load analytics but do not force render until graph mode is active
            window.__salesAnalytics = await apiCall('sales-analytics');
        } catch (err) {
            window.__salesAnalytics = [];
        }
    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}

// ============ DASHBOARD VIEW TOGGLE & CHART ============
let __salesChart = null;
function initDashboardModeToggle() {
    const btnFig = document.getElementById('mode-fig');
    const btnGraph = document.getElementById('mode-graph');
    const chartContainer = document.getElementById('dashboard-chart-container');
    const cards = document.querySelector('.dashboard-cards');
    const granSelect = document.getElementById('analytics-granularity');
    const presets = document.getElementById('analytics-presets');
    const fromInput = document.getElementById('analytics-from');
    const toInput = document.getElementById('analytics-to');
    const applyBtn = document.getElementById('analytics-apply');

    const current = localStorage.getItem('dashboard_mode') || 'fig';
    applyMode(current);

    btnFig?.addEventListener('click', () => applyMode('fig'));
    btnGraph?.addEventListener('click', () => applyMode('graph'));

    function applyMode(mode) {
        localStorage.setItem('dashboard_mode', mode);
        if (mode === 'graph') {
            // hide figure cards, show chart
            if (cards) cards.style.display = 'none';
            if (chartContainer) chartContainer.style.display = '';
            btnFig.classList.remove('active');
            btnGraph.classList.add('active');
            // accessibility
            btnFig.setAttribute('aria-pressed', 'false');
            btnGraph.setAttribute('aria-pressed', 'true');
            // ensure analytics loaded and render chart
            loadAndRenderChart();
        } else {
            // show figure cards, hide chart
            if (cards) cards.style.display = '';
            if (chartContainer) chartContainer.style.display = 'none';
            btnGraph.classList.remove('active');
            btnFig.classList.add('active');
            // accessibility
            btnGraph.setAttribute('aria-pressed', 'false');
            btnFig.setAttribute('aria-pressed', 'true');
            // destroy chart if exists to free resources
            if (__salesChart) { __salesChart.destroy(); __salesChart = null; }
        }
    }

    // helper: load using granularity select and render
    async function loadAndRenderChart() {
        const gran = (granSelect?.value) || localStorage.getItem('analytics_granularity') || 'monthly';
        localStorage.setItem('analytics_granularity', gran);

        // collect date range if provided
        const from = fromInput?.value || '';
        const to = toInput?.value || '';

        let endpoint = `sales-analytics&granularity=${encodeURIComponent(gran)}`;
        if (from) endpoint += `&from=${encodeURIComponent(from)}`;
        if (to) endpoint += `&to=${encodeURIComponent(to)}`;

        try {
            const data = await apiCall(endpoint);
            window.__salesAnalytics = data;
            renderSalesChart(data);
        } catch (err) {
            console.warn('Failed to load analytics', err);
        }
    }

    // change granularity when user selects new option
    granSelect?.addEventListener('change', () => {
        localStorage.setItem('analytics_granularity', granSelect.value);
        if (localStorage.getItem('dashboard_mode') === 'graph') {
            loadAndRenderChart();
        }
    });

    // Export CSV
    const exportBtn = document.getElementById('analytics-export');
    exportBtn?.addEventListener('click', () => {
        exportAnalyticsCSV();
    });

    // Refresh button (manual refresh for analytics)
    const refreshBtn = document.getElementById('analytics-refresh');
    refreshBtn?.addEventListener('click', () => {
        if (localStorage.getItem('dashboard_mode') === 'graph') {
            loadAndRenderChart();
            showAlert('Analytics refreshed', 'success');
        } else {
            showAlert('Switch to Graph Mode to refresh analytics.', 'warning');
        }
    });

    // Preset buttons (7/30/365 days)
    presets?.querySelectorAll('button[data-preset]')?.forEach(btn => {
        btn.addEventListener('click', () => {
            const days = parseInt(btn.getAttribute('data-preset'), 10);
            const today = new Date();
            const to = today.toISOString().split('T')[0];
            const fromDate = new Date(today.getTime() - (days * 24 * 60 * 60 * 1000));
            const from = fromDate.toISOString().split('T')[0];
            if (fromInput) fromInput.value = from;
            if (toInput) toInput.value = to;
            // when in graph mode, refresh
            if (localStorage.getItem('dashboard_mode') === 'graph') {
                loadAndRenderChart();
            }
        });
    });

    // Apply custom range
    applyBtn?.addEventListener('click', () => {
        // simple validation: from <= to when both present
        const from = fromInput?.value;
        const to = toInput?.value;
        if (from && to && new Date(from) > new Date(to)) {
            showAlert('Invalid range: "From" must be before or equal to "To"', 'error');
            return;
        }
        if (localStorage.getItem('dashboard_mode') === 'graph') {
            loadAndRenderChart();
        }
    });
}

async function loadSalesAnalytics() {
    try {
        const data = await apiCall('sales-analytics');
        window.__salesAnalytics = data;
        return data;
    } catch (err) {
        console.error('Sales analytics error', err);
        return [];
    }
}

function renderSalesChart(data) {
    try {
        const ctx = document.getElementById('sales-chart').getContext('2d');
        // prepare labels and datasets
        const labels = data.map(d => d.period);
        const salesData = data.map(d => Number(d.sales_total || 0));
        const profitData = data.map(d => Number(d.profit || 0));
        // accessibility: update canvas aria-label with current granularity/range
        try {
            const gran = localStorage.getItem('analytics_granularity') || 'monthly';
            const from = document.getElementById('analytics-from')?.value || '';
            const to = document.getElementById('analytics-to')?.value || '';
            const canvas = document.getElementById('sales-chart');
            let label = `Sales and profit (${gran})`;
            if (from || to) label += ` from ${from || 'start'} to ${to || 'end'}`;
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', label);
        } catch (e) {}

        // destroy existing chart
        if (__salesChart) __salesChart.destroy();

        // number formatter for KES
        const moneyFormatter = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 });

        __salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Sales (KSh)',
                        data: salesData,
                        borderColor: '#f6c22e',
                        backgroundColor: 'rgba(246,194,46,0.12)',
                        tension: 0.2,
                        fill: true,
                    },
                    {
                        label: 'Profit (KSh)',
                        data: profitData,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40,167,69,0.08)',
                        tension: 0.2,
                        fill: true,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { display: true, title: { display: true, text: 'Period' } },
                    y: {
                        display: true,
                        title: { display: true, text: 'KSh' },
                        ticks: {
                            callback: function(value) { return moneyFormatter.format(value); }
                        }
                    }
                },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                const v = ctx.parsed?.y ?? ctx.raw ?? 0;
                                return ctx.dataset.label + ': ' + moneyFormatter.format(v);
                            }
                        }
                    }
                }
            }
        });

    } catch (err) {
        console.error('renderSalesChart error', err);
    }
}

// ============ SALES ============

async function loadSales() {
    try {
        // Load products for dropdown
        const inventory = await apiCall('inventory');
        const saleProduct = document.getElementById('sale-product');
        saleProduct.innerHTML = '<option value="">Select Product</option>';
        
        inventory.forEach(product => {
            saleProduct.innerHTML += `<option value="${product.product_name}">${product.product_name}</option>`;
        });
        
        // Load all sales
        const salesData = await apiCall('sales');
        const tbody = document.getElementById('all-sales-table');
        tbody.innerHTML = '';
        
        if (salesData.data && salesData.data.length > 0) {
            salesData.data.forEach(sale => {
                tbody.innerHTML += `
                    <tr>
                        <td>${sale.id}</td>
                        <td>${sale.product_name}</td>
                        <td>${sale.quantity}</td>
                        <td>${formatCurrency(sale.unit_price)}</td>
                        <td>${formatCurrency(sale.total_price)}</td>
                        <td>${formatDate(sale.sale_date)}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No sales recorded</td></tr>';
        }
    } catch (error) {
        console.error('Sales load error:', error);
    }
}

// Sales form submission
document.getElementById('sales-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        product_name: document.getElementById('sale-product').value,
        quantity: parseInt(document.getElementById('sale-quantity').value),
        unit_price: parseFloat(document.getElementById('sale-price').value),
        sale_date: document.getElementById('sale-date').value,
        notes: document.getElementById('sale-notes').value
    };
    
    try {
        await apiCall('sales', 'POST', data);
        showAlert('Sale recorded successfully!');
        document.getElementById('sales-form').reset();
        loadSales();
    } catch (error) {
        console.error('Sale submission error:', error);
    }
});

// Set today's date as default
document.getElementById('sale-date')?.addEventListener('focus', function() {
    if (!this.value) {
        this.value = new Date().toISOString().split('T')[0];
    }
});

// ============ INVENTORY ============

async function loadInventory() {
    try {
        // Load suppliers for dropdown
        const suppliers = await apiCall('suppliers');
        const invSupplier = document.getElementById('inv-supplier');
        invSupplier.innerHTML = '<option value="">Select Supplier</option>';
        
        suppliers.forEach(supplier => {
            invSupplier.innerHTML += `<option value="${supplier.id}">${supplier.name}</option>`;
        });
        
        // Load inventory
        const inventory = await apiCall('inventory');
        const tbody = document.getElementById('inventory-table');
        tbody.innerHTML = '';
        
        if (inventory.length > 0) {
            inventory.forEach(product => {
                const margin = ((product.selling_price - product.buying_price) / product.buying_price * 100).toFixed(1);
                const status = product.quantity < product.reorder_level ? 'low-stock' : 'in-stock';
                const statusText = product.quantity < product.reorder_level ? '⚠️ Low Stock' : '✓ In Stock';
                
                tbody.innerHTML += `
                    <tr>
                        <td>${product.product_name}</td>
                        <td>${product.quantity}</td>
                        <td><span class="status-badge ${status}">${statusText}</span></td>
                        <td>${formatCurrency(product.buying_price)}</td>
                        <td>${formatCurrency(product.selling_price)}</td>
                        <td>${margin}%</td>
                        <td>${product.supplier_name || 'N/A'}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No products in inventory</td></tr>';
        }
    } catch (error) {
        console.error('Inventory load error:', error);
    }
}

// Inventory form submission
document.getElementById('inventory-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        product_name: document.getElementById('inv-product').value,
        quantity: parseInt(document.getElementById('inv-quantity').value),
        buying_price: parseFloat(document.getElementById('inv-buying').value),
        selling_price: parseFloat(document.getElementById('inv-selling').value),
        supplier_id: document.getElementById('inv-supplier').value || null,
        reorder_level: parseInt(document.getElementById('inv-reorder').value) || 10,
        description: document.getElementById('inv-description').value
    };
    
    try {
        await apiCall('inventory', 'POST', data);
        showAlert('Product added successfully!');
        document.getElementById('inventory-form').reset();
        loadInventory();
    } catch (error) {
        console.error('Inventory submission error:', error);
    }
});

// ============ SUPPLIERS ============
/**
 * SupplierPaymentsManager
 * Stores per-supplier owed amounts in localStorage and provides helpers
 */
class SupplierPaymentsManager {
    constructor(storageKey = 'supplier_payments') {
        this.storageKey = storageKey;
        this.data = this._read() || {};
    }

    _read() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
        } catch (e) {
            return {};
        }
    }

    _write() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    get(supplierId) {
        return this.data[supplierId] || { owed: 0 };
    }

    set(supplierId, payload) {
        this.data[supplierId] = Object.assign({}, this.get(supplierId), payload);
        this._write();
    }

    clear(supplierId) {
        delete this.data[supplierId];
        this._write();
    }
}

const supplierPayments = new SupplierPaymentsManager();

/**
 * Render suppliers table and attach actions for payments
 */
async function loadSuppliers() {
    try {
        const suppliers = await apiCall('suppliers');
        const tbody = document.getElementById('suppliers-table');
        tbody.innerHTML = '';

        // Try to fetch server-side balances; if unavailable, we'll use localStorage as fallback
        let balancesMap = {};
        try {
            const balances = await apiCall('supplier-balances');
            if (Array.isArray(balances)) {
                balances.forEach(b => { balancesMap[b.id] = parseFloat(b.owed || 0); });
            }
        } catch (e) {
            // server balances not available or error - will fallback to localStorage
            balancesMap = {};
        }

        if (suppliers.length > 0) {
            suppliers.forEach(supplier => {
                const pid = supplier.id || supplier.name; // fallback key
                // prefer server balance when available
                const serverOwed = (supplier.id && balancesMap[supplier.id] !== undefined) ? parseFloat(balancesMap[supplier.id]) : null;
                const paymentInfo = supplierPayments.get(pid);
                const owed = serverOwed !== null ? serverOwed : parseFloat(paymentInfo.owed || 0);
                const status = owed <= 0 ? '<span class="status-badge status-paid">Paid</span>' : (owed > 0 ? '<span class="status-badge status-partial">Owed</span>' : '<span class="status-badge status-unpaid">Unpaid</span>');

                tbody.innerHTML += `
                    <tr data-supplier-id="${pid}">
                        <td>${supplier.name}</td>
                        <td>${supplier.phone}</td>
                        <td>${supplier.email || 'N/A'}</td>
                        <td>${supplier.address || 'N/A'}</td>
                        <td>${supplier.payment_terms || 'N/A'}</td>
                        <td>${supplier.products_supplied || 'N/A'}</td>
                        <td class="supplier-payment-status">${status}</td>
                        <td class="supplier-amount-owed">${owed > 0 ? formatCurrency(owed) : 'KSh 0.00'}</td>
                        <td class="supplier-actions">
                            <button class="btn btn-sm btn-outline" data-action="set-owed">Set Owed</button>
                            <button class="btn btn-sm btn-primary" data-action="record-payment">Record Payment</button>
                            <button class="btn btn-sm btn-outline" data-action="view-ledger">View Ledger</button>
                            <button class="btn btn-sm btn-outline" data-action="migrate">Migrate</button>
                        </td>
                    </tr>
                `;
            });

            // Attach action listeners (use modal dialogs instead of prompt)
            tbody.querySelectorAll('button[data-action]') .forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const action = e.currentTarget.getAttribute('data-action');
                    const row = e.currentTarget.closest('tr');
                    const sid = row.getAttribute('data-supplier-id');
                    const current = supplierPayments.get(sid).owed || 0;

                    if (action === 'set-owed') {
                        // open modal to set owed amount
                        const res = await Modal.prompt({
                            title: 'Set Amount Owed',
                            label: 'Amount owed (KES)',
                            defaultValue: current || 0,
                            placeholder: 'e.g. 1250.50'
                        });

                        if (res !== null) {
                            const n = parseFloat(res) || 0;
                            // if server supports invoices, create one; otherwise persist locally
                            try {
                                if (supplier.id) {
                                    await apiCall('supplier-invoice', 'POST', { supplier_id: supplier.id, amount: n, description: 'Manual set owed' });
                                    showAlert('Invoice recorded on server.', 'success');
                                } else {
                                    supplierPayments.set(sid, { owed: n });
                                }
                            } catch (err) {
                                // fallback to localStorage
                                supplierPayments.set(sid, { owed: n });
                                showAlert('Server not reachable, saved locally.', 'warning');
                            }
                            loadSuppliers();
                        }

                    } else if (action === 'record-payment') {
                        // open modal to record a payment
                        const res = await Modal.prompt({
                            title: 'Record Payment',
                            label: `Current owed: ${formatCurrency(current)} — Enter payment amount (KES)`,
                            defaultValue: 0,
                            placeholder: 'e.g. 500.00'
                        });

                        if (res !== null) {
                            const paid = parseFloat(res) || 0;
                            try {
                                if (supplier.id) {
                                    await apiCall('supplier-payment', 'POST', { supplier_id: supplier.id, amount: paid, method: 'manual', reference: null });
                                    showAlert(`Recorded payment of ${formatCurrency(paid)} on server.`,'success');
                                } else {
                                    const remaining = Math.max(0, current - paid);
                                    supplierPayments.set(sid, { owed: remaining });
                                    showAlert(`Recorded payment of ${formatCurrency(paid)} for supplier.`,'success');
                                }
                            } catch (err) {
                                // fallback to localStorage
                                const remaining = Math.max(0, current - paid);
                                supplierPayments.set(sid, { owed: remaining });
                                showAlert('Server not reachable, recorded locally.', 'warning');
                            }
                            loadSuppliers();
                        }
                    }
                    else if (action === 'view-ledger') {
                        // open ledger viewer modal
                        if (supplier.id) {
                            LedgerViewer.open(supplier.id, supplier.name);
                        } else {
                            // show local info
                            LedgerViewer.openLocal(sid, supplier.name);
                        }
                    }
                    else if (action === 'migrate') {
                        // migrate local owed amount to server as an invoice
                        const local = supplierPayments.get(sid).owed || 0;
                        if (!supplier.id) {
                            showAlert('Cannot migrate: supplier has no server id.', 'error');
                            return;
                        }

                        if (local <= 0) {
                            if (!confirm('No local owed amount found for this supplier. Do you still want to trigger a server invoice of 0?')) return;
                        } else {
                            if (!confirm(`Migrate local owed amount ${formatCurrency(local)} to server as an invoice for ${supplier.name}?`)) return;
                        }

                        // call server to create invoice
                        try {
                            await apiCall('supplier-invoice', 'POST', { supplier_id: supplier.id, amount: local, description: 'Migrated owed from localStorage' });
                            // clear local
                            supplierPayments.clear(sid);
                            showAlert('Migrated local owed to server and cleared local data.', 'success');
                            loadSuppliers();
                        } catch (err) {
                            showAlert('Migration failed: ' + (err.message || err), 'error');
                        }
                    }
                });
            });

        } else {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No suppliers</td></tr>';
        }
    } catch (error) {
        console.error('Suppliers load error:', error);
    }
}

// Supplier form submission
document.getElementById('supplier-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        name: document.getElementById('sup-name').value,
        phone: document.getElementById('sup-phone').value,
        email: document.getElementById('sup-email').value,
        address: document.getElementById('sup-address').value,
        products_supplied: document.getElementById('sup-products').value,
        payment_terms: document.getElementById('sup-terms').value
    };
    
    try {
        await apiCall('suppliers', 'POST', data);
        showAlert('Supplier added successfully!');
        document.getElementById('supplier-form').reset();
        loadSuppliers();
    } catch (error) {
        console.error('Supplier submission error:', error);
    }
});

// ============ PAYOUTS (Bank CSV batch) ============
// Minimal UI & wiring for bank payments CSV batch export (Equity CSV flow)
async function openPayoutsModal() {
    // fetch existing bank payment drafts
    let payments = [];
    try {
        payments = await apiCall('bank-payments');
    } catch (e) {
        payments = [];
    }

    // Build modal DOM
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop open';
    backdrop.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true">
            <h3>Manage Payouts</h3>
            <div class="modal-body" style="max-height:60vh;overflow:auto">
                <div style="margin-bottom:12px">
                    <form id="payout-create-form">
                        <label style="font-weight:600">Create new payout draft</label>
                        <div style="display:flex;gap:8px;margin-top:6px;align-items:center">
                            <select id="payout-supplier" style="flex:1"></select>
                            <input id="payout-amount" type="number" step="0.01" placeholder="Amount KSh" />
                            <button class="btn btn-sm btn-primary" type="submit">Create</button>
                        </div>
                    </form>
                </div>
                <div>
                    <label style="font-weight:600">Drafts</label>
                    <div style="margin-top:8px">
                        <table style="width:100%;border-collapse:collapse">
                            <thead><tr><th style="width:40px"></th><th>Supplier</th><th>Account</th><th>Amount</th><th>Status</th></tr></thead>
                            <tbody id="payouts-list">${payments.map(p => `
                                <tr data-id="${p.id}">
                                    <td><input type="checkbox" data-id="${p.id}" /></td>
                                    <td>${p.supplier_name || ''}</td>
                                    <td>${p.bank_account || p.bank_account || ''}</td>
                                    <td style="text-align:right">${formatCurrency(p.amount)}</td>
                                    <td>${p.status}</td>
                                </tr>
                            `).join('')}</tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div class="modal-actions">
                <button id="payout-export" class="btn btn-outline">Export Selected (CSV)</button>
                <button id="payout-close" class="btn btn-outline">Close</button>
            </div>
        </div>`;

    document.body.appendChild(backdrop);

    // populate supplier select
    const supplierSelect = backdrop.querySelector('#payout-supplier');
    try {
        const suppliers = await apiCall('suppliers');
        supplierSelect.innerHTML = '<option value="">Select supplier</option>' + suppliers.map(s => `<option value="${s.id}" data-bank="${s.bank_account || ''}" data-bankname="${s.bank_name || ''}" data-branch="${s.bank_branch || ''}">${s.name}</option>`).join('');
    } catch (e) {
        supplierSelect.innerHTML = '<option value="">No suppliers</option>';
    }

    // create payout handler
    backdrop.querySelector('#payout-create-form').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const sid = supplierSelect.value;
        const amt = parseFloat(backdrop.querySelector('#payout-amount').value) || 0;
        if (!sid || amt <= 0) { showAlert('Please select supplier and enter amount.', 'error'); return; }

        // find selected supplier bank details from select
        const opt = supplierSelect.querySelector(`option[value="${sid}"]`);
        const bankAccount = opt?.getAttribute('data-bank') || '';
        const bankName = opt?.getAttribute('data-bankname') || '';
        const branch = opt?.getAttribute('data-branch') || '';

        try {
            await apiCall('bank-payments', 'POST', { supplier_id: sid, amount: amt, bank_name: bankName, account_number: bankAccount, branch });
            showAlert('Payout draft created', 'success');
            // refresh list by reloading modal
            backdrop.remove();
            openPayoutsModal();
        } catch (err) {
            console.error('Create payout error', err);
            showAlert('Failed to create payout draft', 'error');
        }
    });

    // export handler
    backdrop.querySelector('#payout-export').addEventListener('click', async () => {
        const checked = Array.from(backdrop.querySelectorAll('input[type=checkbox]:checked')).map(i => i.getAttribute('data-id'));
        try {
            const resp = await apiCall('bank-payments-export', 'POST', { ids: checked });
            const csv = resp.csv || (resp.data && resp.data.csv) || (resp.data && resp.data.csv);
            const batch = resp.batch_id || (resp.data && resp.data.batch_id) || (resp.data && resp.batch_id);
            // handle older response shapes
            const csvContent = resp.data?.csv || resp.csv || (typeof resp === 'string' ? resp : null);
            const csvStr = csvContent || (Array.isArray(resp) ? resp.join('\n') : null);
            const csvToSave = (resp.data && resp.data.csv) || csv || csvStr;
            if (!csvToSave) {
                showAlert('No CSV returned from server.', 'error');
                return;
            }
            // download
            const blob = new Blob([csvToSave], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `payouts_${batch || (new Date().toISOString().split('T')[0])}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            showAlert('CSV exported and drafts marked exported.', 'success');
            backdrop.remove();
        } catch (err) {
            console.error('Export payouts error', err);
            showAlert('Failed to export CSV', 'error');
        }
    });

    backdrop.querySelector('#payout-close').addEventListener('click', () => backdrop.remove());
}

// Wire the Manage Payouts button
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('open-payouts');
    if (btn) btn.addEventListener('click', () => openPayoutsModal());
});

// ============ M-PESA STK PUSH ============

async function loadStkHistory() {
    try {
        const data = await apiCall('stk-history');
        const tbody = document.getElementById('stk-table');
        tbody.innerHTML = '';
        
        if (data.length > 0) {
            data.forEach(push => {
                const statusBadge = `<span class="status-badge status-${push.status}">${push.status.toUpperCase()}</span>`;
                tbody.innerHTML += `
                    <tr>
                        <td>${push.reference}</td>
                        <td>${push.phone}</td>
                        <td>${formatCurrency(push.amount)}</td>
                        <td>${statusBadge}</td>
                        <td>${formatDate(push.created_at)}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No STK push requests</td></tr>';
        }
    } catch (error) {
        console.error('STK history load error:', error);
    }
}

// STK Push form submission
document.getElementById('stk-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        phone: document.getElementById('stk-phone').value,
        amount: parseInt(document.getElementById('stk-amount').value)
    };
    
    try {
        const response = await apiCall('stk-push', 'POST', data);
        showAlert('Payment request sent successfully!');
        document.getElementById('stk-form').reset();
        loadStkHistory();
    } catch (error) {
        console.error('STK push error:', error);
    }
});

// ============ INITIALIZATION ============

// Load dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    initDashboardModeToggle();
});

/**
 * Modal utility (singleton)
 * Usage: const result = await Modal.prompt({ title, label, defaultValue, placeholder })
 * Returns null if cancelled, or the string value if confirmed.
 */
const Modal = (function(){
    let backdrop = null;
    let resolver = null;

    function build() {
        backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.innerHTML = `
            <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <h3 id="modal-title"></h3>
                <div class="modal-body">
                    <div class="input-row">
                        <label id="modal-label"></label>
                        <input id="modal-input" type="text" />
                        <div class="error" id="modal-error" style="display:none"></div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button id="modal-cancel" class="btn btn-outline">Cancel</button>
                    <button id="modal-ok" class="btn btn-primary">Save</button>
                </div>
            </div>`;
        document.body.appendChild(backdrop);

        backdrop.querySelector('#modal-cancel').addEventListener('click', () => close(null));
        backdrop.querySelector('#modal-ok').addEventListener('click', () => confirm());
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(null); });
        backdrop.querySelector('#modal-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') confirm(); });
    }

    function open(opts = {}) {
        if (!backdrop) build();
        const titleEl = backdrop.querySelector('#modal-title');
        const labelEl = backdrop.querySelector('#modal-label');
        const inputEl = backdrop.querySelector('#modal-input');
        const errorEl = backdrop.querySelector('#modal-error');

        titleEl.textContent = opts.title || '';
        labelEl.textContent = opts.label || '';
        inputEl.type = opts.type || 'text';
        inputEl.value = (opts.defaultValue !== undefined && opts.defaultValue !== null) ? String(opts.defaultValue) : '';
        inputEl.placeholder = opts.placeholder || '';
        errorEl.style.display = 'none';
        errorEl.textContent = '';

        backdrop.classList.add('open');
        inputEl.focus();

        return new Promise((resolve) => {
            resolver = resolve;
        });
    }

    function close(value) {
        if (!backdrop) return;
        backdrop.classList.remove('open');
        if (resolver) resolver(value);
        resolver = null;
    }

    function confirm() {
        if (!backdrop) return;
        const inputEl = backdrop.querySelector('#modal-input');
        const errorEl = backdrop.querySelector('#modal-error');
        const val = inputEl.value.trim();

        // Basic validation: number inputs should be valid numbers >= 0
        if (inputEl.type === 'number' || inputEl.type === 'text') {
            // accept numeric values if numeric-looking
            if (val === '') {
                errorEl.textContent = 'Please enter a value.';
                errorEl.style.display = 'block';
                return;
            }
            const n = Number(val.replace(/,/g, ''));
            if (isNaN(n) || n < 0) {
                errorEl.textContent = 'Please enter a valid non-negative number.';
                errorEl.style.display = 'block';
                return;
            }
            close(String(n));
            return;
        }

        // fallback
        close(val);
    }

    return {
        prompt: (opts) => open(opts)
    };
})();

/**
 * LedgerViewer
 * Simple modal to show supplier ledger entries (server) or local owed amount when server not available
 */
const LedgerViewer = (function(){
    let backdrop = null;

    function build() {
        backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.innerHTML = `
            <div class="modal" role="dialog" aria-modal="true">
                <h3 id="ledger-title">Supplier Ledger</h3>
                <div class="modal-body" id="ledger-body">
                    <div id="ledger-loading">Loading...</div>
                </div>
                <div class="modal-actions">
                    <button id="ledger-close" class="btn btn-outline">Close</button>
                </div>
            </div>`;
        document.body.appendChild(backdrop);
        backdrop.querySelector('#ledger-close').addEventListener('click', close);
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    }

    function openFor(supplierId, supplierName) {
        if (!backdrop) build();
        backdrop.classList.add('open');
        backdrop.querySelector('#ledger-title').textContent = `Ledger — ${supplierName}`;
        const body = backdrop.querySelector('#ledger-body');
        body.innerHTML = '<div id="ledger-loading">Loading...</div>';

        // fetch ledger
        fetch(`${API_BASE_URL}?endpoint=supplier-ledger&supplier_id=${encodeURIComponent(supplierId)}`)
            .then(r => r.json())
            .then(resp => {
                if (!resp.success) throw new Error(resp.error || 'Failed');
                const data = resp.data || [];
                render(body, data);
            }).catch(err => {
                body.innerHTML = `<div class="error">Failed to load ledger: ${err.message || err}</div>`;
            });
    }

    function openLocal(sid, supplierName) {
        if (!backdrop) build();
        backdrop.classList.add('open');
        backdrop.querySelector('#ledger-title').textContent = `Ledger — ${supplierName}`;
        const body = backdrop.querySelector('#ledger-body');
        const info = supplierPayments.get(sid) || { owed: 0 };
        body.innerHTML = `
            <div><strong>Local owed amount:</strong> ${formatCurrency(info.owed || 0)}</div>
            <div style="margin-top:12px;color:#666;font-size:13px">This supplier does not have a server id; ledger is not available. Use 'Migrate' to send this balance to the server.</div>
        `;
    }

    function render(container, entries) {
        if (!entries || entries.length === 0) {
            container.innerHTML = '<div>No ledger entries</div>';
            return;
        }
        const rows = entries.map(e => {
            const when = e.created_at ? new Date(e.created_at).toLocaleString() : '';
            if (e.type === 'invoice') {
                return `<tr><td>${when}</td><td>Invoice</td><td style="text-align:right">${formatCurrency(e.amount)}</td><td>${e.description || ''}</td></tr>`;
            } else {
                const ref = e.reference ? ` (${e.reference})` : '';
                return `<tr><td>${when}</td><td>Payment${ref}</td><td style="text-align:right">- ${formatCurrency(e.amount)}</td><td>${e.method || ''}</td></tr>`;
            }
        }).join('');

        container.innerHTML = `
            <table style="width:100%;border-collapse:collapse">
                <thead><tr><th style="text-align:left">Date</th><th style="text-align:left">Type</th><th style="text-align:right">Amount</th><th style="text-align:left">Notes</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }

    function close() { if (backdrop) backdrop.classList.remove('open'); }

    return { open: openFor, openLocal: openLocal };
})();

/**
 * Catalog Search Manager
 * Filters `.catalog-card` elements based on a search input
 */
class CatalogSearchManager {
    constructor(inputSelector = '#catalog-search', cardSelector = '.catalog-card') {
        this.input = document.querySelector(inputSelector);
        this.cardSelector = cardSelector;
        if (this.input) this.init();
    }

    init() {
        this.input.addEventListener('input', (e) => this.filter(e.target.value));
    }

    filter(q) {
        const ql = (q || '').trim().toLowerCase();
        const cards = document.querySelectorAll(this.cardSelector);
        cards.forEach(card => {
            const title = (card.querySelector('.card-title-band')?.textContent || '').toLowerCase();
            const desc = (card.querySelector('.card-desc')?.textContent || '').toLowerCase();
            const matches = !ql || title.includes(ql) || desc.includes(ql);
            card.style.display = matches ? '' : 'none';
        });
    }
}

// instantiate catalog search once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // initialize catalog search manager
    new CatalogSearchManager('#catalog-search', '.catalog-card');
});
