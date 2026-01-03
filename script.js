let chart;

function formatDateTime(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
       + `${pad(d.getHours())}:${pad(d.getMinutes())}`; // Removed seconds for cleaner UI
}

function renderTable(rows) {
  const tbody = document.getElementById('bpi-body');
  tbody.innerHTML = '';
  let prev = null;

  rows.forEach(({ label, price }) => {
    const tr = document.createElement('tr');
    const tdDate = document.createElement('td');
    tdDate.className = 'date-cell';
    tdDate.textContent = label;

    const tdPrice = document.createElement('td');
    tdPrice.textContent = Number(price).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    if (prev !== null) {
      tdPrice.className = price > prev ? 'price-up' : price < prev ? 'price-down' : '';
    }
    prev = price;

    tr.appendChild(tdDate);
    tr.appendChild(tdPrice);
    tbody.prepend(tr); // Newest data at the top
  });
}

function renderChart(labels, prices, chartLabel) {
  const ctx = document.getElementById('bpiChart').getContext('2d');
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: chartLabel,
        data: prices,
        borderColor: '#0073e6',
        backgroundColor: 'rgba(0,115,230,0.2)',
        fill: true,
        tension: 0.1,
        pointRadius: 0 // Cleaner look for high-density hourly data
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { ticks: { maxTicksLimit: 10 } } // Prevents label crowding
      }
    }
  });
}

async function loadLivePrice() {
  const meta = document.getElementById('meta');
  try {
    const res = await fetch('/price'); // Pointing to your backend
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const price = data.bitcoin.USD.rate_float;
    const formatted = formatDateTime(new Date());

    meta.textContent = `Source: ${data.source} | Live at ${formatted} | USD`;
    renderTable([{ label: formatted, price }]);
    renderChart([formatted], [price], 'BTC Price (USD) — Live');
  } catch (e) {
    meta.textContent = 'Error loading live data.';
  }
}

async function loadLast30Days() {
  const meta = document.getElementById('meta');
  try {
    const res = await fetch('/history'); // Pointing to your backend
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const labels = data.bpi.map(item => item.date);
    const prices = data.bpi.map(item => item.price);
    const rows = data.bpi.map(item => ({ label: item.date, price: item.price }));

    meta.textContent = `Source: ${data.source} | Last 30 Days (Hourly Updates) | USD`;
    renderTable(rows);
    renderChart(labels, prices, 'BTC Price (USD) — 30 Day History');
  } catch (e) {
    meta.textContent = 'Error loading history.';
  }
}

document.getElementById('btn-live').addEventListener('click', loadLivePrice);
document.getElementById('btn-30d').addEventListener('click', loadLast30Days);

loadLast30Days();

