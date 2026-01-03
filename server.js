const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Serve static files (index.html, style.css, script.js) from the repo root
app.use(express.static(path.join(__dirname)));

// Simple cache for /price to reduce API calls (30 seconds)
let cache = { value: null, ts: 0, ttl: 30_000 };

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Live price route
app.get('/price', async (req, res) => {
  try {
    const now = Date.now();
    if (cache.value && now - cache.ts < cache.ttl) {
      return res.json({ cached: true, ...cache.value });
    }

    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur,gbp'
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    const result = {
      source: 'CoinGecko',
      updatedISO: new Date().toISOString(),
      bitcoin: {
        USD: { code: 'USD', rate_float: data.bitcoin.usd },
        GBP: { code: 'GBP', rate_float: data.bitcoin.gbp },
        EUR: { code: 'EUR', rate_float: data.bitcoin.eur }
      }
    };

    cache = { value: result, ts: now, ttl: cache.ttl };
    res.json({ cached: false, ...result });
  } catch (err) {
    console.error('Error in /price route:', err);
    res.status(500).json({ error: 'Failed to fetch price', details: err.message });
  }
});

// History route updated to show hours and minutes
app.get('/history', async (req, res) => {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=hourly`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    // Mapping to include hours and minutes
    const history = data.prices.map(([ts, price]) => ({
      // .slice(0, 16) keeps YYYY-MM-DD HH:mm
      date: new Date(ts).toISOString().replace('T', ' ').slice(0, 16), 
      price
    }));

    res.json({
      source: 'CoinGecko',
      currency: 'USD',
      bpi: history
    });
  } catch (err) {
    console.error('Error in /history route:', err);
    res.status(500).json({ error: 'Failed to fetch history', details: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
