const puppeteer = require("puppeteer");
const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// Enable CORS for all requests
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.post("/api/performance", async (req, res, next) => {
  const { urls, websocketURL } = req.body;
  const performanceData = [];

  try {
    // Connect to an existing instance of a Puppeteer-controlled browser
    const browser = await puppeteer.connect({
      browserWSEndpoint: `${websocketURL}`,
    });

    // Retrieve pages from the connected browser
    const pages = await Promise.all(urls.map((urlObject) => browser.newPage()));

    await Promise.all(
      urls.map(async (urlObject, index) => {
        const page = pages[index];
        await page.goto(urlObject.name, {
          waitUntil: "networkidle0",
        });

        // Extract page title
        const title = await page.title();

        // Measure performance metrics
        const timing = await page.evaluate(() => {
          const timing = window.performance.timing;
          return {
            loadTime: timing.loadEventEnd - timing.navigationStart,
            // Add more performance metrics as needed
          };
        });

        performanceData.push({
          id: urlObject.id,
          url: urlObject.name,
          title: title,
          ...timing,
        });
      })
    );

    // Disconnect from the browser
    browser.disconnect();

    res.json(performanceData);
  } catch (error) {
    console.error("Error occurred while processing URLs:", error);
    next(error);
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
