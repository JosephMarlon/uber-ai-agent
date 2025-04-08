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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load CSV data
fs.createReadStream('crime_data.csv')
  .pipe(csv())
  .on('data', (row) => riskData.push(row))
  .on('end', () => {
    console.log(`Loaded ${riskData.length} crime records`);
  });

// Twilio client
const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// API endpoints
app.get('/check-risk/:postalCode', (req, res) => {
  const area = riskData.find(a => a.postal_code === req.params.postalCode);
  res.json(area || { error: "Postal code not found" });
});

app.post('/whatsapp', async (req, res) => {
  try {
    const incomingMsg = req.body.Body.trim();
    const postalCode = incomingMsg;
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

// Cron job
cron.schedule('0 8 * * *', () => {
  require('./scraper');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}) .on('error', (err) =>{
  console.error('Server failed to start :',err.message);
});