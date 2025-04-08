const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const cron = require('node-cron');
const twilio = require('twilio');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 5000;
let riskData = [];

// ======== CORS CONFIGURATION ========
const corsOptions = {
  origin: 'http://127.0.0.1:5500',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
};

// Handle preflight requests first
app.options('*', cors(corsOptions));

// Apply CORS middleware
app.use(cors(corsOptions));

// ======== ESSENTIAL MIDDLEWARE ========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======== DATA LOADING ========
const loadCSVData = () => {
  riskData = [];
  fs.createReadStream('crime_data.csv')
    .pipe(csv())
    .on('data', (row) => {
      // Convert numeric fields
      row.crime_level = parseInt(row.crime_level) || 0;
      riskData.push(row);
    })
    .on('end', () => console.log(`Loaded ${riskData.length} crime records`))
    .on('error', (err) => {
      console.error('CSV load error:', err);
      process.exit(1);
    });
};

loadCSVData();

// ======== TWILIO CLIENT ========
const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ======== API ENDPOINTS ========
app.get('/check-risk/:postalCode', (req, res) => {
  const areas = riskData.filter(a => a.postal_code === req.params.postalCode);
  if (areas.length === 0) {
    return res.status(404).json({ error: "Postal code not found" });
  }
  res.json(areas);
});

app.post('/whatsapp', async (req, res) => {
  try {
    const postalCode = req.body.Body.trim();
    const area = riskData.find(a => a.postal_code === postalCode);

    if (!area) {
      await client.messages.create({
        body: "❌ Invalid postal code. Try 7764 (Manenberg) or 7750 (Gugulethu).",
        from: 'whatsapp:+14155238886',
        to: req.body.From
      });
      return res.status(200).send();
    }

    await client.messages.create({
      body: `🚨 Safety Alert for ${area.suburb} (${postalCode}):\nCrime Level: ${area.crime_level}/5\nGang Activity: ${area.gang_activity_level}\nNotes: ${area.notes}`,
      from: 'whatsapp:+14155238886',
      to: req.body.From
    });

    res.status(200).send();
  } catch (error) {
    console.error('WhatsApp error:', error);
    res.status(500).send();
  }
});

// ======== CRON JOB ========
cron.schedule('0 8 * * *', () => {
  try {
    require('./scraper');
    loadCSVData(); // Reload data after scraping
  } catch (err) {
    console.error('Cron job error:', err);
  }
});

// ======== SERVER START ========
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
}).on('error', (err) => {
  console.error('❌ Server failed to start:', err.message);
  process.exit(1);
});