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

async function fetchWithRetry(url, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempting to fetch (attempt ${i + 1}/${retries}): ${url}`);
      const res = await fetch(url);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`HTTP ${res.status}: ${errorText}`);
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      return await res.json();
    } catch (error) {
      console.error(`Fetch attempt ${i + 1} failed:`, error);
      
      if (i === retries - 1) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function loadLivePrice() {
  const meta = document.getElementById('meta');
  if (!meta) {
    console.error('Meta element not found!');
    return;
  }
  
  meta.textContent = 'Loading last 24 hours...';
  
  try {
    // Fetch last 24 hours - CoinGecko will automatically provide multiple data points
    const data = await fetchWithRetry(
      'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1'
    );

    // Check if we got data
    if (!data.prices || data.prices.length === 0) {
      throw new Error('No price data returned from API');
    }

    console.log(`✓ Received ${data.prices.length} data points for last 24 hours`);

    const timestamps = data.prices.map(([ts]) => ts);
    const labels = data.prices.map(([ts]) => formatDateTime(ts));
    const prices = data.prices.map(([, price]) => price);

    const rows = data.prices.map(([ts, price]) => ({
      label: formatDateTime(ts),
      price
    }));

    const start = labels[0];
    const end = labels[labels.length - 1];
    meta.textContent = `Source: CoinGecko | Last 24 Hours (${data.prices.length} points): ${start} - ${end} | USD`;

    renderTable(rows);
    renderChart(timestamps, prices, 'BTC Price (USD) - Last 24 Hours', false);

  } catch (e) {
    console.error('Failed to load 24-hour data:', e);
    
    // Provide more specific error messages
    let errorMsg = 'Error loading live data: ';
    if (e.message.includes('Failed to fetch')) {
      errorMsg += 'Network error or CORS issue. Please check your internet connection or try again later.';
    } else if (e.message.includes('429')) {
      errorMsg += 'Rate limit exceeded. Please wait a moment and try again.';
    } else {
      errorMsg += e.message;
    }
    
    meta.textContent = errorMsg;
    meta.style.color = '#d13c3c';
    
    // Reset color after 3 seconds
    setTimeout(() => {
      meta.style.color = '#666';
    }, 3000);
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
    const data = await fetchWithRetry(
      'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily'
    );

    // Check if we got data
    if (!data.prices || data.prices.length === 0) {
      throw new Error('No price data returned from API');
    }

    console.log(`✓ Received ${data.prices.length} data points for last 30 days`);

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
    
    let errorMsg = 'Error loading history: ';
    if (e.message.includes('Failed to fetch')) {
      errorMsg += 'Network error or CORS issue. Please check your internet connection or try again later.';
    } else if (e.message.includes('429')) {
      errorMsg += 'Rate limit exceeded. Please wait a moment and try again.';
    } else {
      errorMsg += e.message;
    }
    
    meta.textContent = errorMsg;
    meta.style.color = '#d13c3c';
    
    setTimeout(() => {
      meta.style.color = '#666';
    }, 3000);
  }
}

// Wait for DOM to be ready before running code
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function initApp() {
  console.log('🚀 Initializing Bitcoin Price App...');
  console.log('📊 Using CoinGecko API (Free tier: 30 calls/min)');
  
  // Wire up buttons
  const btnLive = document.getElementById('btn-live');
  const btn30d = document.getElementById('btn-30d');
  
  if (btnLive && btn30d) {
    btnLive.addEventListener('click', loadLivePrice);
    btn30d.addEventListener('click', loadLast30Days);
    
    // Load last 30 days by default
    console.log('📈 Loading default view (30 days)...');
    loadLast30Days();
  } else {
    console.error('❌ Button elements not found!');
  }
}
