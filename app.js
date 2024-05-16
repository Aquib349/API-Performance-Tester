const express = require("express");
const cors = require("cors");
const puppeteer_core = require("puppeteer-core");
const chrome = require("chrome-aws-lambda");
const puppeteer = require("puppeteer");
const {
  defaultViewport,
  executablePath,
  headless,
} = require("chrome-aws-lambda");
const app = express();

// let chrome = {};
// let puppeteer;

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  chrome;
  puppeteer_core;
} else {
  puppeteer;
}

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
  let options = {};
  if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    options = {
      args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    };
  }

  const { urls, websocketURL } = req.body;
  const performanceData = [];

  try {
    // Connect to an existing instance of a Puppeteer-controlled browser
    const browser = await puppeteer.connect({
      browserWSEndpoint: `${websocketURL}`,
    });
    // const browser = await (puppeteer ? puppeteer : puppeteer_core).launch({
    //   headless: false,
    // });

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

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send(err.stack);
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
