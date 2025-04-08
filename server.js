const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const app = express();
const PORT = 5000;

let riskData = [];

// Load CSV data
fs.createReadStream('crime_data.csv')
  .pipe(csv())
  .on('data', (row) => riskData.push(row))
  .on('end', () => {
    console.log('Crime data loaded');
  });

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
//nst twilio = require('twilio');
//nst client = new twilio(
  //ocess.env.TWILIO_SID ||"YOUR_TWILIO_SID", 
  //ocess.env.TWILIO_AUTH_TOKEN || "YOUR_TWILIO_TOKEN"

//

// Send WhatsApp alert
//p.post('/send-alert/:postalCode', async (req, res) => {
 //onst area = riskData.find(a => a.postal_code === req.params.postalCode);
 //f (!area) return res.status(404).json({ error: "Postal code not found" });

  //ait client.messages.create({
 // body: `🚨 Safety Alert: ${area.suburb} is HIGH RISK (Crime Level: ${area.crime_level}/5). Avoid unnecessary stops.`,
  //from: 'whatsapp:+14155238886', // Twilio's sandbox number
  //to: 'whatsapp:+27844096060 curl -X POST http://localhost:3000/send-alert/7764' // Driver's number (with country code)
 //);

 //es.json({ success: true });
//;///

app.post('/whatsapp', async (req, res) => {
  const incomingMsg = req.body.Body.trim(); // Postal code sent by driver
  const postalCode = incomingMsg;

  // Find the area
  const area = riskData.find(a => a.postal_code === postalCode);
  
  // Twilio client setup (use your credentials)
  const client = twilio(
    process.env.TWILIO_SID, 
    process.env.TWILIO_AUTH_TOKEN
  );

  if (!area) {
    // Send error reply
    await client.messages.create({
      body: "❌ Invalid postal code. Try 7764 (Manenberg) or 7750 (Gugulethu).",
      from: 'whatsapp:+14155238886',
      to: req.body.From // Driver’s WhatsApp number (e.g., whatsapp:+2784096060)
    });
    return res.status(200).send();
  }

  // Send safety alert
  await client.messages.create({
    body: `🚨 Safety Alert for ${area.suburb} (${postalCode}):\nCrime Level: ${area.crime_level}/5\nGang Activity: ${area.gang_activity_level}\nNotes: ${area.notes}`,
    from: 'whatsapp:+14155238886',
    to: req.body.From
  });

  res.status(200).send(); // Twilio requires a response
});