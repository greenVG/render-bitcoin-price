// Keep reference to chart data for updates
let chartData = null;

function formatDateTime(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
       + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDateShort(ts) {
  const d = new Date(ts);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[d.getMonth()]} ${d.getDate()}`;
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

function renderChart(labels, prices, chartLabel, isShortFormat = false) {
  const canvas = document.getElementById('bpiChart');
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  // For 30-day chart, use shorter labels
  const displayLabels = isShortFormat 
    ? labels.map(ts => formatDateShort(new Date(ts)))
    : labels;

  const trace = {
    x: displayLabels,
    y: prices,
    type: 'scatter',
    mode: 'lines+markers',
    name: chartLabel,
    line: { color: '#0073e6', width: 3 },
    marker: { size: 8, color: '#0073e6' },
    hovertemplate: 'Date: %{x}<br>Price: $%{y:.2f}<extra></extra>'
  };

  const layout = {
    title: chartLabel,
    xaxis: {
      title: isShortFormat ? 'Date' : 'Date/Time',
      tickangle: -45,
      automargin: true
    },
    yaxis: {
      title: 'Price (USD)',
      tickprefix: '$',
      automargin: true
    },
    margin: { l: 70, r: 30, t: 50, b: 80 },
    height: isShortFormat ? 550 : 400
  };

  Plotly.newPlot(canvas, [trace], layout, { responsive: true });
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
    renderChart([formatted], [price], 'BTC Price (USD) - Live', false);

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

    const timestamps = data.prices.map(([ts]) => ts);
    const labels = data.prices.map(([ts]) => formatDateTime(ts));
    const prices = data.prices.map(([, price]) => price);

    const rows = data.prices.map(([ts, price]) => ({
      label: formatDateTime(ts),
      price
    }));

    const start = labels[0];
    const end = labels[labels.length - 1];
    meta.textContent = `Source: CoinGecko | Range: ${start} - ${end} | USD`;

    renderTable(rows);
    renderChart(timestamps, prices, 'BTC Price (USD) - Last 30 Days', true);
  } catch (e) {
    console.error('Failed to load 30-day history:', e);
    meta.textContent = 'Error loading history: ' + e.message;
  }
}

// Wait for DOM to be ready before running code
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
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
