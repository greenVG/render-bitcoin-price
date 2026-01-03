const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

// Simple cache for /price to reduce API calls (30 seconds)
let cache = { value: null, ts: 0, ttl: 30_000 };

// Health endpoint (for you and Render)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Live price with metadata (USD, GBP, EUR) using CoinGecko
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

// Optional: last 30 days of USD close prices using CoinGecko
app.get('/history', async (req, res) => {
  try {
    const today = new Date();
    const end = today.toISOString().slice(0, 10);
    const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    // CoinGecko returns an array of [timestamp, price]
    const history = data.prices.map(([ts, price]) => ({
      date: new Date(ts).toISOString().slice(0, 10),
      price
    }));

    res.json({
      source: 'CoinGecko',
      currency: 'USD',
      range: { start: startDate, end },
      bpi: history
    });
  } catch (err) {
    console.error('Error in /history route:', err);
    res.status(500).json({ error: 'Failed to fetch history', details: err.message });
  }
});

// Root help
app.get('/', (req, res) => {
  res.send('Bitcoin API (CoinGecko): /price (USD/GBP/EUR), /history (last 30 days USD), /health');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

