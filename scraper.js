const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// Target: SAPS crime stats or local news (e.g., News24)
const URL = 'https://www.news24.com/tags/crime';

async function scrapeCrimeData() {
  try {
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    const recentCrimes = [];
    $('article').each((i, elem) => {
      const title = $(elem).find('h3').text().trim();
      const suburbMatch = title.match(/Cape Town|Khayelitsha|Delft|Manenberg/i); // Adjust keywords
      if (suburbMatch) {
        recentCrimes.push({
          suburb: suburbMatch[0],
          incident: title,
          date: $(elem).find('time').text().trim() || 'Today'
        });
      }
    });

    // Save to JSON (or update your CSV)
    fs.writeFileSync('recent_crimes.json', JSON.stringify(recentCrimes, null, 2));
    console.log('Crime data updated!');
  } catch (err) {
    console.error('Scraping failed:', err);
  }
}

scrapeCrimeData();