let chart; // keep reference to the chart to update/replace

function renderTable(rows) {
  const tbody = document.getElementById('bpi-body');
  tbody.innerHTML = '';
  let prev = null;

  rows.forEach(({ label, price }) => {
    const tr = document.createElement('tr');

    const tdDate = document.createElement('td');
    tdDate.className = 'date-cell';
    tdDate.textContent = label; // now includes date + time

    const tdPrice = document.createElement('td');
    tdPrice.textContent = Number(price).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    if (prev !== null) {
      tdPrice.className = price > prev ? 'price-up' : price < prev ? 'price-down' : '';
    }
    prev = price;

    tr.appendChild(tdDate);
    tr.appendChild(tdPrice);
    tbody.appendChild(tr);
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
        tension: 0.2,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const value = ctx.parsed.y;
              return `Price: ${Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`;
            }
          }
        }
      },
      scales: {
        x: { title: { display: true, text: 'Date/Time' } },
        y: { title: { display: true, text: 'Price (USD)' } }
      }
    }
  });
}

async function loadLivePrice() {
  const meta = document.getElementById('meta');
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const price = data.bitcoin.usd;
    const now = new Date();

    // Force full date + time
    const formatted = now.toLocaleString('en-US', { 
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    meta.textContent = `Source: CoinGecko | Live at ${formatted} | USD`;

    // Table: single row
    renderTable([{ label: formatted, price }]);

    // Chart: single point
    renderChart([formatted], [price], 'BTC Price (USD) — Live');

  } catch (e) {
    console.error('Failed to load live price:', e);
    meta.textContent = 'Error loading live data.';
  }
}

async function loadLast30Days() {
  const meta = document.getElementById('meta');
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Format each timestamp with full date + time
    const labels = data.prices.map(([ts]) => new Date(ts).toLocaleString('en-US', { 
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }));
    const prices = data.prices.map(([, price]) => price);

    const rows = data.prices.map(([ts, price]) => ({
      label: new Date(ts).toLocaleString('en-US', { 
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }),
      price
    }));

    const start = labels[0];
    const end = labels[labels.length - 1];
    meta.textContent = `Source: CoinGecko | Range: ${start} – ${end} | USD`;

    renderTable(rows);
    renderChart(labels, prices, 'BTC Price (USD) — Last 30 Days');
  } catch (e) {
    console.error('Failed to load 30-day history:', e);
    meta.textContent = 'Error loading history.';
  }
}

// Wire up buttons and default view
document.getElementById('btn-live').addEventListener('click', loadLivePrice);
document.getElementById('btn-30d').addEventListener('click', loadLast30Days);

// Load last 30 days by default
loadLast30Days();

