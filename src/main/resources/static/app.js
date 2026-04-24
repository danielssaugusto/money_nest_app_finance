const API_URL = '/api/transactions';

// Auth Check
let token = localStorage.getItem('token');
const isLoginPage = window.location.pathname.includes('login.html');

if (!token && !isLoginPage) {
    window.location.replace('login.html');
}

// DOM Elements
const balanceEl = document.getElementById('total-balance');
const incomeEl = document.getElementById('total-income');
const expensesEl = document.getElementById('total-expenses');
const tableBody = document.getElementById('transactions-body');
const modal = document.getElementById('transaction-modal');
const modalTitle = modal.querySelector('.modal-header h2');
const openModalBtn = document.getElementById('open-modal');
const closeBtn = document.querySelector('.close');
const transactionForm = document.getElementById('transaction-form');
const transactionIdInput = document.getElementById('transaction-id');
const userNameEl = document.querySelector('.welcome');
const userAvatarEl = document.querySelector('.avatar');

// New Elements
const themeToggle = document.getElementById('theme-toggle');
const searchInput = document.getElementById('search-input');
const filterType = document.getElementById('filter-type');
const savingsPercent = document.getElementById('savings-percent');
const savingsProgress = document.getElementById('savings-progress');
const savingsAmount = document.getElementById('savings-amount');

let allTransactions = [];

// Helper for Fetch with Auth
async function authenticatedFetch(url, options = {}) {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) return null;

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`,
        ...options.headers
    };

    try {
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            if (!isLoginPage) {
                setTimeout(() => {
                    localStorage.removeItem('token');
                    window.location.replace('login.html');
                }, 500);
            }
            return null;
        }
        if (response.status === 403) {
            console.error('Acesso negado (403)');
            return response;
        }
        return response;
    } catch (err) {
        console.error('Erro de rede:', err);
        return null;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (token && !isLoginPage) {
        updateUserInfo();
        fetchData();
        initTheme();
    }
});

function updateUserInfo() {
    const preferredName = localStorage.getItem('preferredName');
    const fullName = localStorage.getItem('userName');
    const displayName = preferredName || fullName || 'Usuário';

    if (userNameEl) userNameEl.textContent = `Olá, ${displayName}`;
    if (userAvatarEl) userAvatarEl.textContent = displayName.charAt(0).toUpperCase();
}

// Logout
if (userAvatarEl) {
    userAvatarEl.style.cursor = 'pointer';
    userAvatarEl.onclick = () => {
        Swal.fire({
            title: 'Sair da conta?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sair',
            ...swalConfig()
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.clear();
                window.location.href = 'login.html';
            }
        });
    };
}

const swalConfig = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        background: isDark ? '#1e293b' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a',
        confirmButtonColor: '#6366f1',
        cancelButtonColor: '#f43f5e'
    };
};

async function fetchData() {
    try {
        const [transactionsRes, balanceRes] = await Promise.all([
            authenticatedFetch(API_URL),
            authenticatedFetch(`${API_URL}/balance`)
        ]);

        if (transactionsRes && transactionsRes.ok) {
            allTransactions = await transactionsRes.json();
            applyFilters();
        }

        if (balanceRes && balanceRes.ok) {
            const balance = await balanceRes.json();
            updateDashboard(allTransactions, balance);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function updateDashboard(transactions, balance) {
    const income = transactions
        .filter(t => t.type === 'INCOME')
        .reduce((acc, t) => acc + t.amount, 0);

    const expenses = transactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((acc, t) => acc + t.amount, 0);

    if (balanceEl) balanceEl.textContent = formatCurrency(balance);
    if (incomeEl) incomeEl.textContent = formatCurrency(income);
    if (expensesEl) expensesEl.textContent = formatCurrency(expenses);

    updateInsights(income, expenses);
}

function updateInsights(income, expenses) {
    const savings = Math.max(0, income - expenses);
    const percent = income > 0 ? Math.round((savings / income) * 100) : 0;

    if (savingsPercent) {
        savingsPercent.textContent = `${percent}%`;
        savingsProgress.style.width = `${percent}%`;
        savingsAmount.textContent = formatCurrency(savings);
    }
}

function renderTable(transactions) {
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(t => {
        const row = document.createElement('tr');
        const date = new Date(t.date).toLocaleDateString('pt-BR');

        row.innerHTML = `
            <td data-label="Data">${date}</td>
            <td data-label="Descrição" style="font-weight: 600">${t.description}</td>
            <td data-label="Banco"><span style="font-size: 0.85rem; color: var(--text-muted)">${t.bank || '-'}</span></td>
            <td data-label="Tipo"><span class="badge badge-${t.type.toLowerCase()}">${t.type === 'INCOME' ? 'Entrada' : 'Saída'}</span></td>
            <td data-label="Valor" style="font-weight: 800; color: ${t.type === 'INCOME' ? 'var(--income)' : 'var(--expense)'}">
                ${t.type === 'INCOME' ? '+' : '-'} ${formatCurrency(t.amount)}
            </td>
            <td style="text-align: right; white-space: nowrap;">
                <button class="btn-action btn-edit" onclick="editTransaction('${t.id}')" title="Editar">
                    <i class="fas fa-pen-to-square"></i>
                </button>
                <button class="btn-action btn-delete" onclick="deleteTransaction('${t.id}')" title="Excluir">
                    <i class="fas fa-trash-can"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    if (transactions.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 4rem; color: var(--text-muted); font-weight: 500;">Nenhuma transação encontrada.</td></tr>';
    }
}

function renderAccountDistribution(transactions) {
    const distributionEl = document.getElementById('account-distribution');
    if (!distributionEl) return;

    const banks = {};
    transactions.forEach(t => {
        const bank = t.bank || 'Outros';
        const amount = t.type === 'INCOME' ? t.amount : -t.amount;
        banks[bank] = (banks[bank] || 0) + amount;
    });

    distributionEl.innerHTML = '';
    Object.entries(banks).forEach(([bank, balance]) => {
        const item = document.createElement('div');
        item.className = 'distribution-item';
        item.innerHTML = `
            <span>${bank}</span>
            <span style="font-weight: 700; color: ${balance >= 0 ? 'var(--income)' : 'var(--expense)'}">
                ${formatCurrency(balance)}
            </span>
        `;
        distributionEl.appendChild(item);
    });
}

function applyFilters() {
    const searchTerm = searchInput?.value.toLowerCase() || "";
    const typeValue = filterType?.value || "all";

    const filtered = allTransactions.filter(t => {
        const matchesSearch = t.description.toLowerCase().includes(searchTerm) ||
            (t.bank && t.bank.toLowerCase().includes(searchTerm));
        const matchesType = typeValue === 'all' || t.type.toLowerCase() === typeValue;

        return matchesSearch && matchesType;
    });

    renderTable(filtered);
    renderAccountDistribution(filtered);
}

if (searchInput) searchInput.addEventListener('input', applyFilters);
if (filterType) filterType.addEventListener('change', applyFilters);

// Theme Logic
function initTheme() {
    const savedTheme = localStorage.getItem('theme');

    if (!savedTheme) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const systemTheme = prefersDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', systemTheme);
        updateThemeIcon(systemTheme);
    } else {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }
}

if (themeToggle) {
    themeToggle.onclick = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    };
}

function updateThemeIcon(theme) {
    const icon = themeToggle?.querySelector('i');
    if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function editTransaction(id) {
    const t = allTransactions.find(item => item.id === id);
    if (!t) return;

    transactionForm.reset();
    transactionIdInput.value = t.id;
    document.getElementById('amount').value = t.amount;
    document.getElementById('description').value = t.description;
    document.getElementById('bank').value = t.bank || "";
    document.getElementById('type').value = t.type;

    modalTitle.textContent = 'Editar Transação';
    modal.style.display = 'flex';
}

async function deleteTransaction(id) {
    const result = await Swal.fire({
        title: 'Excluir registro?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, excluir',
        ...swalConfig()
    });

    if (result.isConfirmed) {
        try {
            const response = await authenticatedFetch(`${API_URL}/${id}`, { method: 'DELETE' });
            if (response && response.ok) { showToast('success', 'Excluído!'); fetchData(); }
        } catch (error) { showToast('error', 'Falha ao excluir.'); }
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

if (openModalBtn) openModalBtn.onclick = () => {
    transactionForm.reset();
    transactionIdInput.value = '';
    modalTitle.textContent = 'Nova Transação';
    modal.style.display = 'flex';
    document.getElementById('amount').focus();
};

if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';

if (transactionForm) transactionForm.onsubmit = async (e) => {
    e.preventDefault();

    const amountVal = document.getElementById('amount').value;
    if (!amountVal || isNaN(parseFloat(amountVal)) || parseFloat(amountVal) <= 0) {
        showToast('error', 'Por favor, insira um valor válido maior que zero.');
        return;
    }

    const id = transactionIdInput.value;
    const isEdit = !!id;

    const data = {
        amount: parseFloat(amountVal),
        description: document.getElementById('description').value,
        bank: document.getElementById('bank').value,
        type: document.getElementById('type').value
    };

    try {
        const response = await authenticatedFetch(isEdit ? `${API_URL}/${id}` : API_URL, {
            method: isEdit ? 'PUT' : 'POST',
            body: JSON.stringify(data)
        });

        if (response && response.ok) {
            showToast('success', `Transação ${isEdit ? 'atualizada' : 'salva'} com sucesso!`);
            modal.style.display = 'none';
            fetchData();
        } else if (response) {
            const errData = await response.json().catch(() => ({}));
            console.error('Erro do servidor:', errData);
            showToast('error', errData.message || 'Erro ao processar dados no servidor.');
        } else {
            showToast('error', 'Não foi possível conectar ao servidor.');
        }
    } catch (error) { showToast('error', 'Erro ao salvar.'); }
};

const toggleBalanceBtn = document.getElementById('toggle-balance');
if (toggleBalanceBtn) {
    let isBalanceVisible = localStorage.getItem('balanceVisible') !== 'false';
    const updateBalanceVisibility = () => {
        const container = document.querySelector('.app-container');
        const icon = toggleBalanceBtn.querySelector('i');
        if (isBalanceVisible) {
            container.classList.remove('balance-hidden');
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        } else {
            container.classList.add('balance-hidden');
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        }
        localStorage.setItem('balanceVisible', isBalanceVisible);
    };
    toggleBalanceBtn.onclick = () => { isBalanceVisible = !isBalanceVisible; updateBalanceVisibility(); };
    updateBalanceVisibility();
}

function showToast(icon, message) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    Swal.fire({
        toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
        icon, title: message, background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a'
    });
}
