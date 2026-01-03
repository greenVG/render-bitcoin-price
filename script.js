let chart; // keep reference to the chart to update/replace

function formatDateTime(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
       + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDateShort(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

function renderTable(rows) {
  const tbody = document.getElementById('bpi-body');
  if (!tbody) {
    console.error('Table body element not found!');
    return;
  }
  
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
    tbody.appendChild(tr);
  });
}

function renderChart(labels, prices, chartLabel) {
  const canvas = document.getElementById('bpiChart');
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }
  
  const ctx = canvas.getContext('2d');
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
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 8,
        pointBackgroundColor: '#0073e6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: '#0073e6',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 3,
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { 
          display: true,
          labels: {
            font: {
              size: 14,
              weight: 'bold'
            },
            padding: 15
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 16,
            weight: 'bold'
          },
          padding: 12,
          displayColors: true,
          callbacks: {
            title: (tooltipItems) => {
              return tooltipItems[0].label;
            },
            label: (context) => {
              const value = context.parsed.y;
              return `Price: ${Number(value).toLocaleString('en-US', { 
                style: 'currency', 
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}`;
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Date/Time',
            font: {
              size: 14,
              weight: 'bold'
            },
            padding: 10
          },
          ticks: {
            font: {
              size: 12
            },
            maxRotation: 45,
            minRotation: 45,
            autoSkip: true,
            maxTicksLimit: 15
          },
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        y: { 
          title: { 
            display: true, 
            text: 'Price (USD)',
            font: {
              size: 14,
              weight: 'bold'
            },
            padding: 10
          },
          ticks: {
            font: {
              size: 14,
              weight: 'bold'
            },
            color: '#333',
            padding: 8,
            callback: function(value) {
              return '$' + value.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              });
            }
          },
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.1)',
            lineWidth: 1
          }
        }
      }
    }
  });
}

async function loadLivePrice() {
  const meta = document.getElementById('meta');
  if (!meta) {
    console.error('Meta element not found!');
    return;
  }
  
  meta.textContent = 'Loading live price...';
  
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const price = data.bitcoin.usd;
    const now = new Date();
    const formatted = formatDateTime(now);

    meta.textContent = `Source: CoinGecko | Live at ${formatted} | USD`;

    renderTable([{ label: formatted, price }]);
    renderChart([formatted], [price], 'BTC Price (USD) — Live');

  } catch (e) {
    console.error('Failed to load live price:', e);
    meta.textContent = 'Error loading live data: ' + e.message;
  }
}

async function loadLast30Days() {
  const meta = document.getElementById('meta');
  if (!meta) {
    console.error('Meta element not found!');
    return;
  }
  
  meta.textContent = 'Loading last 30 days...';
  
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily'
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const labels = data.prices.map(([ts]) => formatDateTime(ts));
    const prices = data.prices.map(([, price]) => price);

    const rows = data.prices.map(([ts, price]) => ({
      label: formatDateTime(ts),
      price
    }));

    const start = labels[0];
    const end = labels[labels.length - 1];
    meta.textContent = `Source: CoinGecko | Range: ${start} — ${end} | USD`;

    renderTable(rows);
    renderChart(labels, prices, 'BTC Price (USD) — Last 30 Days');
  } catch (e) {
    console.error('Failed to load 30-day history:', e);
    meta.textContent = 'Error loading history: ' + e.message;
  }
}

// CRITICAL FIX: Wait for DOM to be ready before running code
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM is already ready
  initApp();
}

function initApp() {
  console.log('Initializing Bitcoin Price App...');
  
  // Wire up buttons
  const btnLive = document.getElementById('btn-live');
  const btn30d = document.getElementById('btn-30d');
  
  if (btnLive && btn30d) {
    btnLive.addEventListener('click', loadLivePrice);
    btn30d.addEventListener('click', loadLast30Days);
    
    // Load last 30 days by default
    loadLast30Days();
  } else {
    console.error('Button elements not found!');
  }
}
