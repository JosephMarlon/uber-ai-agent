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

// API endpoint
app.get('/check-risk/:postalCode', (req, res) => {
  const area = riskData.find(a => a.postal_code === req.params.postalCode);
  res.json(area || { error: "Postal code not found" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});