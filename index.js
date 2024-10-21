const express = require("express");
const cors = require("cors");

let chrome = {};
let puppeteer;

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  chrome = require("chrome-aws-lambda");
  puppeteer = require("puppeteer-core");
} else {
  puppeteer = require("puppeteer");
}

const app = express();
app.use(cors());  // Enable CORS for all requests

// Add a route to accept Flipkart URL as a query parameter
app.get('/start-puppeteer', async (req, res) => {
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
    try {
        let browser = await puppeteer.launch(options);
        console.log("FlipKart URL: " + req.query.url);
        const flipkartUrl = req.query.url;  // Get the Flipkart URL from the query parameter
        
        if (!flipkartUrl) {
            return res.status(400).send('Flipkart URL is required.');
        }

        const page = await browser.newPage();

        // Navigate to the Flipkart page using the dynamic URL
        await page.goto(flipkartUrl);

        // Wait for the element with the class _6EBuvT to be present
        await page.waitForSelector('._6EBuvT');  

        // Extract the product name or relevant text from Flipkart
        const extractedText = await page.evaluate(() => {
            const element = document.querySelector('._6EBuvT');
            return element ? element.innerText : 'Element not found';
        });

        // Extract the price from Flipkart
        const extractedPrice = await page.evaluate(() => {
            const price = document.querySelector('.Nx9bqj.CxhGGd');
            return price ? price.innerText : 'Element not found';
        });

        console.log('Extracted Price from Flipkart:', extractedPrice);
        console.log('Extracted Text from Flipkart:', extractedText);

        // Navigate to Amazon and get search results based on the extracted text
        const amazonUrl = `https://www.amazon.in/s?k=${encodeURIComponent(extractedText)}`;
        await page.goto(amazonUrl, { timeout: 30000 });

        // Pass `extractedPrice` into the browser context and use it
        const results = await page.evaluate((extractedPrice) => {
            const items = [];
            const priceElements = document.querySelectorAll('.a-price-whole');
            const ratingElements = document.querySelectorAll('.a-icon-alt');
            const linkElements = document.querySelectorAll('.a-link-normal.s-underline-text.s-underline-link-text.s-link-style.a-text-normal');
            
            for (let i = 0; i < 10; i++) {
                const price = priceElements[i]?.innerText || "No price available";
                const rating = ratingElements[i]?.innerText?.slice(0, 3) || "No rating available";
                const link = linkElements[i]?.href || "No Link Available";
                
                // Push the extracted Flipkart price with Amazon results
                items.push({ price, rating, link, extractedPrice });
            }

            return items;
        }, extractedPrice);

        console.log("Amazon Results:", results);
        await browser.close();

        // Send back the extracted data as a response
        res.json({ results });
    } catch (error) {
        console.error("Error running Puppeteer:", error);
        res.status(500).send("Failed to run Puppeteer script.");
    }
});

// Use the process.env.PORT for dynamic port assignment on Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;