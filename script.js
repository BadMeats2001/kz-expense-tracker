// 1. Находим элементы в HTML
const form = document.getElementById('transaction-form');
const typeSelect = document.getElementById('type');
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const dateInput = document.getElementById('date');
const noteInput = document.getElementById('note');

const balanceEl = document.getElementById('balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpensesEl = document.getElementById('total-expenses');
const transactionsBody = document.getElementById('transactions-body');
const periodSelect = document.getElementById('period');


// 2. Массив всех транзакций
let transactions = [];

let selectedPeriod = 'this_month';
periodSelect.addEventListener('change', function () {
  selectedPeriod = periodSelect.value;
  renderTransactions();
  updateSummary();
});


// загрузка сохранённых транзакций при старте
loadTransactionsFromStorage();
let expensesChart = null;
updateSummary();
renderTransactions();



// 3. Обработчик отправки формы
form.addEventListener('submit', function (event) {
  event.preventDefault(); // не перезагружать страницу

  const type = typeSelect.value;           // "income" или "expense"
  const amount = Number(amountInput.value);
  const category = categorySelect.value;
  const date = dateInput.value;
  const note = noteInput.value.trim();

  if (!amount || amount <= 0 || !date) {
    alert('Please enter a valid amount and date');
    return;
  }

  const transaction = {
    id: Date.now(),
    type,
    amount,
    category,
    date,
    note
  };

  transactions.push(transaction);
  saveTransactionsToStorage();


  // перерисовать таблицу и суммы
  renderTransactions();
  updateSummary();

  // очистить форму
  form.reset();
});

// Возвращает массив транзакций с учётом выбранного периода
function getVisibleTransactions() {
  if (selectedPeriod === 'all_time') {
    return transactions;
  }

  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();

  return transactions.filter((tx) => {
    if (!tx.date) return false;
    const parts = tx.date.split('-'); // "YYYY-MM-DD"
    if (parts.length < 2) return false;

    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1; // 0-11

    return year === currentYear && month === currentMonth;
  });
}

// 4. Рендерим строки таблицы
function renderTransactions() {
  transactionsBody.innerHTML = '';
  const visible = getVisibleTransactions();
  visible.forEach((tx) => {

      const row = document.createElement('tr');

    const dateCell = document.createElement('td');
    dateCell.textContent = tx.date;

    const typeCell = document.createElement('td');
    typeCell.textContent = tx.type === 'income' ? 'Income' : 'Expense';

    const categoryCell = document.createElement('td');
    categoryCell.textContent = tx.category;

    const noteCell = document.createElement('td');
    noteCell.textContent = tx.note || '-';

    const amountCell = document.createElement('td');
    amountCell.textContent = tx.amount.toLocaleString('en-US') + ' KZT';

    const actionsCell = document.createElement('td');
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'delete-btn';
    deleteButton.addEventListener('click', function () {
      deleteTransaction(tx.id);
    });
    actionsCell.appendChild(deleteButton);


    row.appendChild(dateCell);
    row.appendChild(typeCell);
    row.appendChild(categoryCell);
    row.appendChild(noteCell);
    row.appendChild(amountCell);
    row.appendChild(actionsCell);

    transactionsBody.appendChild(row);
  });
}

// 5. Считаем баланс, доходы и расходы
function updateSummary() {
  let totalIncome = 0;
  let totalExpenses = 0;

  const visible = getVisibleTransactions();

  visible.forEach((tx) => {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else {
      totalExpenses += tx.amount;
    }
  });

  const periodLabel = document.getElementById('period-label');
if (periodLabel) {
  periodLabel.textContent =
    selectedPeriod === 'this_month' ? 'This month' : 'All time';
}

  const balance = totalIncome - totalExpenses;

  balanceEl.textContent = balance.toLocaleString('en-US') + ' KZT';
  totalIncomeEl.textContent = totalIncome.toLocaleString('en-US') + ' KZT';
  totalExpensesEl.textContent = totalExpenses.toLocaleString('en-US') + ' KZT';

  updateChart(visible);
}


// 6. Сохраняем массив транзакций в localStorage
function saveTransactionsToStorage() {
  localStorage.setItem('kz_expense_transactions', JSON.stringify(transactions));
}

// 7. Загружаем массив транзакций из localStorage
function loadTransactionsFromStorage() {
  const stored = localStorage.getItem('kz_expense_transactions');
  if (stored) {
    try {
      transactions = JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse stored transactions', e);
      transactions = [];
    }
  }
}

// 8. Обновляем график расходов по категориям
function updateChart(sourceTransactions) {
  const categoryTotals = {};

  (sourceTransactions || []).forEach((tx) => {
    if (tx.type !== 'expense') return;
    if (!categoryTotals[tx.category]) {
      categoryTotals[tx.category] = 0;
    }
    categoryTotals[tx.category] += tx.amount;
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);

  const ctx = document.getElementById('expenses-chart');

  if (!ctx) return;

  const colors = [
    '#0ea5e9',
    '#22c55e',
    '#ef4444',
    '#f97316',
    '#8b5cf6',
    '#14b8a6',
    '#eab308',
    '#64748b'
  ];

  const backgroundColors = labels.map((_, index) => colors[index % colors.length]);

  const config = {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: backgroundColors
        }
      ]
    },
    options: {
      plugins: {
        legend: {
          position: 'bottom'
        },
        title: {
          display: data.length > 0,
          text: 'Expenses by category (KZT)'
        }
      }
    }
  };

  if (expensesChart) {
    expensesChart.destroy();
  }

  if (data.length > 0) {
    expensesChart = new Chart(ctx, config);
  }
}

// 9. Удаление транзакции по id
function deleteTransaction(id) {
  // убираем из массива
  transactions = transactions.filter((tx) => tx.id !== id);

  // сохраняем в localStorage
  saveTransactionsToStorage();

  // обновляем таблицу, суммы и график
  renderTransactions();
  updateSummary();
}


