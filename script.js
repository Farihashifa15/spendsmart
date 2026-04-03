// ============================================================
//  script.js — SpendSmart v2
//  NEW FEATURES: Spending Chart, Budget Limit, CSV Export
// ============================================================


// ---- Grab all HTML elements ----
const form           = document.getElementById('expense-form');
const nameInput      = document.getElementById('expense-name');
const amountInput    = document.getElementById('expense-amount');
const categoryInput  = document.getElementById('expense-category');
const dateInput      = document.getElementById('expense-date');
const expenseList    = document.getElementById('expense-list');
const totalDisplay   = document.getElementById('total');
const entryCount     = document.getElementById('entry-count');
const topCategory    = document.getElementById('top-category');
const emptyState     = document.getElementById('empty-state');
const clearAllBtn    = document.getElementById('clear-all');
const filterCategory = document.getElementById('filter-category');
const budgetInput    = document.getElementById('budget-input');
const budgetBarFill  = document.getElementById('budget-bar-fill');
const budgetStatus   = document.getElementById('budget-status');
const budgetWrapper  = document.getElementById('budget-bar-wrapper');
const chartCanvas    = document.getElementById('spending-chart');
const chartEmpty     = document.getElementById('chart-empty');


// ---- Default date to today ----
dateInput.value = new Date().toISOString().split('T')[0];


// ---- Load data from localStorage ----
let expenses = JSON.parse(localStorage.getItem('spendsmart-expenses')) || [];
let budget   = parseFloat(localStorage.getItem('spendsmart-budget')) || 0;

// If a budget was previously saved, show it in the input
if (budget > 0) {
  budgetInput.value = budget;
  budgetWrapper.style.display = 'block';
}


// ---- Category emoji map ----
const categoryEmoji = {
  Food:          '🍔',
  Transport:     '🚗',
  Entertainment: '🎬',
  Shopping:      '🛍️',
  Health:        '💊',
  Bills:         '💡',
  Other:         '📦',
};

// ---- Colors for chart — one per category ----
const categoryColors = {
  Food:          '#c8f135',
  Transport:     '#378ADD',
  Entertainment: '#7F77DD',
  Shopping:      '#D85A30',
  Health:        '#1D9E75',
  Bills:         '#EF9F27',
  Other:         '#888',
};


// ============================================================
//  CHART SETUP
//  We create ONE chart instance and update it whenever data changes.
//  chartType can be 'pie' or 'bar'
// ============================================================

let chartInstance = null;   // stores the Chart.js chart object
let chartType     = 'pie';  // default chart type

// Called by the Pie / Bar toggle buttons in HTML
function switchChart(type) {
  chartType = type;

  // Update active button style
  document.getElementById('btn-pie').classList.toggle('active', type === 'pie');
  document.getElementById('btn-bar').classList.toggle('active', type === 'bar');

  // Re-draw the chart with the new type
  updateChart();
}

// Builds or updates the Chart.js chart
function updateChart() {

  // Build category totals object: { Food: 450, Transport: 200, ... }
  const totals = {};
  expenses.forEach(exp => {
    totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
  });

  const labels = Object.keys(totals);
  const data   = Object.values(totals);
  const colors = labels.map(l => categoryColors[l] || '#888');

  // If no data, hide canvas and show empty message
  if (labels.length === 0) {
    chartCanvas.style.display = 'none';
    chartEmpty.style.display  = 'block';
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    return;
  }

  // Show canvas, hide empty message
  chartCanvas.style.display = 'block';
  chartEmpty.style.display  = 'none';

  // If a chart already exists, destroy it before making a new one
  // (Chart.js requirement — can't redraw on same canvas without destroying first)
  if (chartInstance) {
    chartInstance.destroy();
  }

  // Create the Chart.js chart
  // Chart.js needs: type, labels, datasets, and options
  chartInstance = new Chart(chartCanvas, {
    type: chartType,   // 'pie' or 'bar'
    data: {
      labels: labels,
      datasets: [{
        data:            data,
        backgroundColor: colors,
        borderColor:     '#1a1a1a',
        borderWidth:     2,
        borderRadius:    chartType === 'bar' ? 6 : 0,  // rounded bars only
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: '#f0f0f0',       // white text for dark theme
            font: { size: 13 },
            padding: 16,
          }
        },
        tooltip: {
          callbacks: {
            // Show ₹ symbol in tooltip
            label: function(context) {
              return ' ₹' + context.parsed.toFixed(2);
            }
          }
        }
      },
      scales: chartType === 'bar' ? {
        // Only bar chart needs axis config
        x: { ticks: { color: '#888' }, grid: { color: '#2e2e2e' } },
        y: { ticks: { color: '#888', callback: v => '₹' + v }, grid: { color: '#2e2e2e' } }
      } : {}   // pie chart doesn't use scales
    }
  });
}


// ============================================================
//  BUDGET LIMIT
//  Reads the budget, saves it, and updates the progress bar.
// ============================================================

function setBudget() {
  const val = parseFloat(budgetInput.value);

  if (isNaN(val) || val <= 0) {
    alert('Please enter a valid budget amount.');
    return;
  }

  budget = val;
  localStorage.setItem('spendsmart-budget', budget);  // save to localStorage
  budgetWrapper.style.display = 'block';               // show the progress bar
  updateBudgetBar();
}

function updateBudgetBar() {

  // If no budget set, nothing to show
  if (budget <= 0) return;

  // Calculate how much has been spent in total
  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Calculate percentage (cap at 100 for the bar width)
  const percent = Math.min((totalSpent / budget) * 100, 100);

  // Update bar fill width
  budgetBarFill.style.width = percent + '%';

  // Change bar color based on how close to the limit
  budgetBarFill.classList.remove('warning', 'over');
  if (percent >= 100) {
    budgetBarFill.classList.add('over');         // red — over budget
  } else if (percent >= 80) {
    budgetBarFill.classList.add('warning');      // orange — 80%+ warning
  }

  // Update labels
  document.getElementById('budget-spent-label').textContent = 'Spent: ₹' + totalSpent.toFixed(2);
  document.getElementById('budget-limit-label').textContent = 'Limit: ₹' + budget.toFixed(2);

  // Update status message
  const remaining = budget - totalSpent;
  if (remaining < 0) {
    budgetStatus.textContent = '⚠️ Over budget by ₹' + Math.abs(remaining).toFixed(2) + '!';
    budgetStatus.style.color = '#ff4d4d';
  } else if (percent >= 80) {
    budgetStatus.textContent = '⚠️ Almost at your limit! ₹' + remaining.toFixed(2) + ' remaining.';
    budgetStatus.style.color = '#EF9F27';
  } else {
    budgetStatus.textContent = '✅ ₹' + remaining.toFixed(2) + ' remaining this month.';
    budgetStatus.style.color = '#1D9E75';
  }
}


// ============================================================
//  CSV EXPORT
//  Converts the expenses array into a CSV string and downloads it.
// ============================================================

function exportCSV() {

  if (expenses.length === 0) {
    alert('No expenses to export!');
    return;
  }

  // CSV header row
  const headers = ['Name', 'Amount (₹)', 'Category', 'Date'];

  // Convert each expense object into a CSV row
  const rows = expenses.map(exp => [
    exp.name,
    exp.amount.toFixed(2),
    exp.category,
    exp.date,
  ]);

  // Join headers and rows into one big string
  // Each row is joined by commas, rows are separated by newlines
  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');

  // Create a Blob (a file-like object in JS) from the CSV string
  const blob = new Blob([csvContent], { type: 'text/csv' });

  // Create a temporary invisible link element
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);           // point link to the blob
  link.download = 'spendsmart-expenses.csv';       // filename for download

  // Trigger the download by clicking the link programmatically
  link.click();

  // Clean up the temporary URL
  URL.revokeObjectURL(link.href);
}


// ============================================================
//  SAVE TO STORAGE
// ============================================================
function saveToStorage() {
  localStorage.setItem('spendsmart-expenses', JSON.stringify(expenses));
}


// ============================================================
//  UPDATE SUMMARY CARDS
// ============================================================
function updateSummary() {
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  totalDisplay.textContent = '₹' + total.toFixed(2);
  entryCount.textContent   = expenses.length;

  const categoryTotals = {};
  expenses.forEach(exp => {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  });

  const keys = Object.keys(categoryTotals);
  if (keys.length === 0) {
    topCategory.textContent = '—';
  } else {
    const top = keys.sort((a, b) => categoryTotals[b] - categoryTotals[a])[0];
    topCategory.textContent = categoryEmoji[top] + ' ' + top;
  }
}


// ============================================================
//  RENDER EXPENSE LIST
// ============================================================
function renderList() {
  const filter   = filterCategory.value;
  const filtered = filter === 'All'
    ? expenses
    : expenses.filter(exp => exp.category === filter);

  expenseList.innerHTML = '';
  emptyState.style.display = filtered.length === 0 ? 'block' : 'none';

  filtered.forEach(exp => {
    const li = document.createElement('li');
    li.classList.add('expense-item');
    li.innerHTML = `
      <div class="expense-left">
        <div class="category-badge">${categoryEmoji[exp.category]}</div>
        <div>
          <div class="expense-name">${exp.name}</div>
          <div class="expense-meta">${exp.category} · ${exp.date}</div>
        </div>
      </div>
      <div class="expense-right">
        <span class="expense-amount">₹${exp.amount.toFixed(2)}</span>
        <button class="btn-delete" onclick="deleteExpense('${exp.id}')">✕</button>
      </div>
    `;
    expenseList.appendChild(li);
  });

  updateSummary();
  updateChart();       // redraw chart whenever list changes
  updateBudgetBar();   // update budget bar whenever list changes
}


// ============================================================
//  DELETE ONE EXPENSE
// ============================================================
function deleteExpense(id) {
  expenses = expenses.filter(exp => exp.id !== id);
  saveToStorage();
  renderList();
}


// ============================================================
//  FORM SUBMIT — Add new expense
// ============================================================
form.addEventListener('submit', function(event) {
  event.preventDefault();

  const name     = nameInput.value.trim();
  const amount   = parseFloat(amountInput.value);
  const category = categoryInput.value;
  const date     = dateInput.value;

  if (!name || isNaN(amount) || amount <= 0) {
    alert('Please enter a valid name and amount.');
    return;
  }

  const newExpense = {
    id:       Date.now().toString(),
    name,
    amount,
    category,
    date,
  };

  expenses.unshift(newExpense);
  saveToStorage();
  renderList();

  nameInput.value   = '';
  amountInput.value = '';
  nameInput.focus();
});


// ============================================================
//  FILTER CHANGE
// ============================================================
filterCategory.addEventListener('change', renderList);


// ============================================================
//  CLEAR ALL
// ============================================================
clearAllBtn.addEventListener('click', function() {
  if (confirm('Are you sure you want to delete all expenses?')) {
    expenses = [];
    saveToStorage();
    renderList();
  }
});


// ============================================================
//  INIT — run on page load
// ============================================================
renderList();

