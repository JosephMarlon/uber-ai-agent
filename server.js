const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const app = express();
const PORT = 3000;

let riskData = [];

// Load CSV data
fs.createReadStream('crime_data.csv')
  .pipe(csv())
  .on('data', (row) => riskData.push(row))
  .on('end', () => {
    console.log('Crime data loaded');
  });
//not sure
app.use(express.json()); // Parse JSON bodies
// API endpoint
app.get('/check-risk/:postalCode', (req, res) => {
  const area = riskData.find(a => a.postal_code === req.params.postalCode);
  res.json(area || { error: "Postal code not found" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


const cron = require('node-cron');
cron.schedule('0 8 * * *', () => { // Runs at 8 AM daily
  require('./scraper.js');
});



//WhatsApp Alerts (Twilio API)
const twilio = require('twilio');
const client = new twilio(
  process.env.TWILIO_SID ||"YOUR_TWILIO_SID", 
  process.env.TWILIO_AUTH_TOKEN || "YOUR_TWILIO_TOKEN"

);
//not sure
app.use(express.json()); // Parse JSON bodies
// Send WhatsApp alert
app.post('/send-alert/:postalCode', async (req, res) => {
  const area = riskData.find(a => a.postal_code === req.params.postalCode);
  if (!area) return res.status(404).json({ error: "Postal code not found" });

  await client.messages.create({
    body: `🚨 Safety Alert: ${area.suburb} is HIGH RISK (Crime Level: ${area.crime_level}/5). Avoid unnecessary stops.`,
    from: 'whatsapp:+14155238886', // Twilio's sandbox number
    to: 'whatsapp:+27844096060 curl -X POST http://localhost:3000/send-alert/7764' // Driver's number (with country code)
  });

  res.json({ success: true });
});

///not sure
const cors = require('cors');
app.use(cors()); // Allow all origins (for testing)

app.post('/send-alert/:postalCode', async (req, res) => {
  console.log("Request received:", req.params.postalCode); // Debug log
  const area = riskData.find(a => a.postal_code === req.params.postalCode);
  if (!area) {
    console.log("Postal code not found:", req.params.postalCode);
    return res.status(404).json({ error: "Postal code not found" });
  }

  try {
    const message = await client.messages.create({
      body: `🚨 Safety Alert: ${area.suburb} is HIGH RISK (Crime Level: ${area.crime_level}/5).`,
      from: 'whatsapp:+14155238886',
      to: 'whatsapp:+27YOUR_PHONE_NUMBER' // Replace with your number
    });
    console.log("WhatsApp message SID:", message.sid); // Log Twilio response
    res.json({ success: true });
  } catch (err) {
    console.error("Twilio error:", err);
    res.status(500).json({ error: "Failed to send alert" });
  }
});