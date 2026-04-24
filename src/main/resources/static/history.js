const API_URL = '/api/transactions';
const token = localStorage.getItem('token');
let allHistory = [];

if (!token) {
    window.location.replace('login.html');
}

// Global variable for theme toggle
let themeToggle;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    themeToggle = document.getElementById('theme-toggle');
    
    if (token) {
        updateUserInfo();
        fetchHistory();
        initTheme(); // Using the identical logic from app.js
    }

    // Filter listeners
    const monthInp = document.getElementById('history-month');
    const searchInp = document.getElementById('search-desc');
    const bankSel = document.getElementById('filter-bank');
    const typeSel = document.getElementById('filter-type');

    if (monthInp) {
        const now = new Date();
        monthInp.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        // Initialize Flatpickr Elite Month Picker
        flatpickr(monthInp, {
            locale: "pt",
            plugins: [
                new monthSelectPlugin({
                    shorthand: true,
                    dateFormat: "Y-m",
                    altFormat: "F Y",
                    theme: "light"
                })
            ],
            onChange: function() {
                renderHistory();
            }
        });
    }
    if (searchInp) searchInp.addEventListener('input', renderHistory);
    if (bankSel) bankSel.addEventListener('change', renderHistory);
    if (typeSel) typeSel.addEventListener('change', renderHistory);
});

// Identical Theme Logic to app.js
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggleBtn = document.getElementById('theme-toggle');
    
    if (!savedTheme) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const systemTheme = prefersDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', systemTheme);
        updateThemeIcon(systemTheme);
    } else {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    if (themeToggleBtn) {
        themeToggleBtn.onclick = () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        };
    }
}

function updateThemeIcon(theme) {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
}

async function fetchHistory() {
    try {
        const response = await fetch(API_URL, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            window.location.replace('login.html');
            return;
        }

        if (response.ok) {
            allHistory = await response.json();
            updateBankFilter();
            renderHistory();
        }
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
    }
}

function updateUserInfo() {
    const displayName = localStorage.getItem('preferredName') || localStorage.getItem('userName') || 'Usuário';
    const nameEl = document.getElementById('user-display-name');
    const avatarEl = document.getElementById('user-avatar');
    
    if (nameEl) nameEl.textContent = displayName;
    if (avatarEl) {
        avatarEl.textContent = displayName.charAt(0).toUpperCase();
        avatarEl.style.cursor = 'pointer';
        avatarEl.onclick = () => {
            Swal.fire({
                title: 'Sair da conta?',
                text: "Você precisará fazer login novamente.",
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sair agora',
                cancelButtonText: 'Cancelar',
                background: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1e293b' : '#ffffff',
                color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#f8fafc' : '#0f172a',
                confirmButtonColor: '#6366f1',
                cancelButtonColor: '#f43f5e'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.clear();
                    window.location.href = 'login.html';
                }
            });
        };
    }
}

function updateBankFilter() {
    const bankSelect = document.getElementById('filter-bank');
    if (!bankSelect) return;
    
    const banks = [...new Set(allHistory.map(t => t.bank).filter(Boolean))];
    const currentBank = bankSelect.value;
    bankSelect.innerHTML = '<option value="">Todos os Bancos</option>' + 
        banks.map(b => `<option value="${b}" ${b === currentBank ? 'selected' : ''}>${b}</option>`).join('');
}

function renderHistory() {
    const body = document.getElementById('history-body');
    if (!body) return;

    const monthInput = document.getElementById('history-month');
    const selectedMonth = monthInput ? monthInput.value : "";
    const searchTerm = document.getElementById('search-desc')?.value.toLowerCase() || "";
    const selectedBank = document.getElementById('filter-bank')?.value || "";
    const selectedType = document.getElementById('filter-type')?.value || "";

    const filtered = allHistory.filter(t => {
        const tDate = new Date(t.date);
        const tMonth = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
        
        const matchesMonth = !selectedMonth || tMonth === selectedMonth;
        
        // Smart Search: Check description, bank, and value
        const valStr = t.amount.toString().replace('.', ',');
        const typeStr = t.type === 'INCOME' ? 'entrada' : 'saida';
        const matchesSearch = !searchTerm || 
            t.description.toLowerCase().includes(searchTerm) ||
            (t.bank && t.bank.toLowerCase().includes(searchTerm)) ||
            valStr.includes(searchTerm) ||
            typeStr.includes(searchTerm);

        const matchesBank = !selectedBank || t.bank === selectedBank;
        const matchesType = !selectedType || t.type === selectedType;

        return matchesMonth && matchesSearch && matchesBank && matchesType;
    });

    const countEl = document.getElementById('results-count');
    if (countEl) countEl.textContent = `Exibindo ${filtered.length} transações`;

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    body.innerHTML = '';
    
    let inc = 0, exp = 0;
    filtered.forEach(t => {
        if (t.type === 'INCOME') inc += t.amount; else exp += t.amount;
        const row = document.createElement('tr');
        const date = new Date(t.date).toLocaleDateString('pt-BR');
        
        row.innerHTML = `
            <td data-label="Data">${date}</td>
            <td data-label="Descrição" style="font-weight: 600">${t.description}</td>
            <td data-label="Banco">${t.bank || '-'}</td>
            <td data-label="Tipo"><span class="badge badge-${t.type.toLowerCase()}">${t.type === 'INCOME' ? 'Entrada' : 'Saída'}</span></td>
            <td data-label="Valor" style="font-weight: 800; color: ${t.type === 'INCOME' ? 'var(--income)' : 'var(--expense)'}">
                ${t.type === 'INCOME' ? '+' : '-'} ${formatCurrency(t.amount)}
            </td>
        `;
        body.appendChild(row);
    });

    const incEl = document.getElementById('month-income');
    const expEl = document.getElementById('month-expense');
    const totEl = document.getElementById('month-total');

    if (incEl) incEl.textContent = formatCurrency(inc);
    if (expEl) expEl.textContent = formatCurrency(exp);
    
    const total = inc - exp;
    if (totEl) {
        totEl.textContent = formatCurrency(total);
        totEl.style.color = total >= 0 ? 'var(--income)' : 'var(--expense)';
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function exportToCSV() {
    const selectedMonth = document.getElementById('history-month')?.value || 'extrato';
    const filtered = allHistory.filter(t => {
        const tDate = new Date(t.date);
        const tMonth = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
        return !selectedMonth || tMonth === selectedMonth;
    });

    const headers = ['Data', 'Descrição', 'Banco', 'Tipo', 'Valor'];
    const rows = filtered.map(t => [
        new Date(t.date).toLocaleDateString('pt-BR'),
        t.description,
        t.bank || '-',
        t.type === 'INCOME' ? 'Entrada' : 'Saída',
        t.amount.toFixed(2).replace('.', ',')
    ]);

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `extrato_${selectedMonth}.csv`;
    link.click();
}

// Balance Visibility Toggle
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
