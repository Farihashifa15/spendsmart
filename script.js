// ============================================================
//  script.js — SpendSmart
//  This file handles ALL the logic of the app.
//  Read each section carefully — every line is commented!
// ============================================================


// ---- STEP 1: Grab all the HTML elements we need ----
// document.getElementById() finds an element by its id="" in HTML

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


// ---- STEP 2: Set today's date as default in the date input ----
// new Date() gives today. toISOString() converts it to "2025-04-03T..."
// .split('T')[0] keeps only the "2025-04-03" part (what <input type="date"> needs)

dateInput.value = new Date().toISOString().split('T')[0];


// ---- STEP 3: Load expenses from localStorage ----
// localStorage stores data in the browser even after page refresh.
// We store our expenses as a JSON string and parse it back into an array.

// JSON.parse converts the string back to a real JS array.
// If nothing is stored yet, we use an empty array [] as default.

let expenses = JSON.parse(localStorage.getItem('spendsmart-expenses')) || [];


// ---- STEP 4: Category emoji map ----
// A plain object that maps each category name to an emoji.
// We use this to show the right emoji badge next to each expense.

const categoryEmoji = {
  Food:          '🍔',
  Transport:     '🚗',
  Entertainment: '🎬',
  Shopping:      '🛍️',
  Health:        '💊',
  Bills:         '💡',
  Other:         '📦',
};


// ============================================================
//  FUNCTION: saveToStorage
//  Saves the current expenses array to localStorage.
//  We call this every time the array changes.
// ============================================================
function saveToStorage() {
  // JSON.stringify converts the JS array into a string for storage.
  localStorage.setItem('spendsmart-expenses', JSON.stringify(expenses));
}


// ============================================================
//  FUNCTION: updateSummary
//  Recalculates and updates the 3 summary cards at the top.
// ============================================================
function updateSummary() {

  // Calculate total by adding all amounts together.
  // .reduce() loops through the array and accumulates a value.
  // 'sum' starts at 0, and we add each expense's amount each time.
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Update the Total card. .toFixed(2) shows 2 decimal places.
  totalDisplay.textContent = '₹' + total.toFixed(2);

  // Update entry count
  entryCount.textContent = expenses.length;

  // Find the top category ----
  // First build an object like { Food: 450, Transport: 200, ... }
  const categoryTotals = {};

  expenses.forEach(exp => {
    // If this category hasn't been seen yet, start it at 0
    if (!categoryTotals[exp.category]) {
      categoryTotals[exp.category] = 0;
    }
    categoryTotals[exp.category] += exp.amount;
  });

  // Object.keys() gives us all category names as an array.
  // We sort them by total amount (highest first) and pick [0].
  const keys = Object.keys(categoryTotals);

  if (keys.length === 0) {
    topCategory.textContent = '—';
  } else {
    const top = keys.sort((a, b) => categoryTotals[b] - categoryTotals[a])[0];
    topCategory.textContent = categoryEmoji[top] + ' ' + top;
  }
}


// ============================================================
//  FUNCTION: renderList
//  Clears and redraws the expense list on screen.
//  Called every time we add, delete, or filter.
// ============================================================
function renderList() {

  // Get the currently selected filter value
  const filter = filterCategory.value;

  // Filter the array. If "All" is selected, show everything.
  // Otherwise only show expenses that match the chosen category.
  const filtered = filter === 'All'
    ? expenses
    : expenses.filter(exp => exp.category === filter);

  // Clear whatever is currently in the list
  expenseList.innerHTML = '';

  // Show/hide the empty state message
  if (filtered.length === 0) {
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
  }

  // Loop through each expense and create an <li> for it
  filtered.forEach(exp => {

    // Create a new list item element
    const li = document.createElement('li');
    li.classList.add('expense-item');

    // Fill it with HTML using a template literal (backtick strings)
    // exp.id is used so the delete button knows which item to remove
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

    // Add this item to the list
    expenseList.appendChild(li);
  });

  // Always update the summary cards after re-rendering
  updateSummary();
}


// ============================================================
//  FUNCTION: deleteExpense
//  Removes one expense from the array by its unique id.
// ============================================================
function deleteExpense(id) {

  // .filter() returns a new array without the item that matches the id.
  // This does NOT change the original array — it creates a new one.
  expenses = expenses.filter(exp => exp.id !== id);

  saveToStorage();   // Save the updated array
  renderList();      // Redraw the list
}


// ============================================================
//  EVENT: Form submit — add a new expense
//  This runs when the user clicks "Add Expense"
// ============================================================
form.addEventListener('submit', function(event) {

  // Prevent the page from refreshing (default form behavior)
  event.preventDefault();

  // Read the values the user typed in
  const name     = nameInput.value.trim();       // .trim() removes extra spaces
  const amount   = parseFloat(amountInput.value); // convert string to decimal number
  const category = categoryInput.value;
  const date     = dateInput.value;

  // Basic validation — don't add if name is empty or amount is invalid
  if (!name || isNaN(amount) || amount <= 0) {
    alert('Please enter a valid name and amount.');
    return;
  }

  // Create a new expense object
  // Date.now() gives a unique number (milliseconds since 1970) — used as id
  const newExpense = {
    id:       Date.now().toString(),  // unique identifier
    name:     name,
    amount:   amount,
    category: category,
    date:     date,
  };

  // Add the new expense to the beginning of the array (newest first)
  expenses.unshift(newExpense);

  saveToStorage();   // Save to localStorage
  renderList();      // Redraw the list

  // Clear the form fields (except date — keep today's date)
  nameInput.value   = '';
  amountInput.value = '';
  nameInput.focus(); // Move cursor back to name field
});


// ============================================================
//  EVENT: Filter dropdown changed
//  Re-renders the list filtered by the selected category
// ============================================================
filterCategory.addEventListener('change', function() {
  renderList();
});


// ============================================================
//  EVENT: Clear All button
//  Removes every expense after confirmation
// ============================================================
clearAllBtn.addEventListener('click', function() {

  // Show a confirmation popup before deleting everything
  const confirmed = confirm('Are you sure you want to delete all expenses?');

  if (confirmed) {
    expenses = [];       // Reset to empty array
    saveToStorage();     // Save the empty array
    renderList();        // Redraw (will show empty state)
  }
});


// ============================================================
//  INIT: Run renderList() when the page first loads
//  This shows any expenses that were saved from a previous session
// ============================================================
renderList();
