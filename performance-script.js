const puppeteer = require("puppeteer");
const express = require("express");
const cors = require("cors");
const app = express();

app.use(express.json());
app.use(cors());

app.post("/api/performance", async (req, res) => {
  const { urls, websocketURL } = req.body;
  const performanceData = [];

  // Connect to an existing instance of a Puppeteer-controlled browser
  const browser = await puppeteer.connect({
    browserWSEndpoint: `${websocketURL}`,
  });

  try {
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
  } catch (error) {
    console.error("Error occurred while processing URLs:", error);
  } finally {
    // Disconnect from the browser
    await browser.disconnect();
    res.json(performanceData);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
