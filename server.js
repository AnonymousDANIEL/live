import http from "http";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

const PORT = process.env.PORT || 3000;
const TARGET_URL = "https://bintang44.asia/";
const CACHE_MS = 10000;

let browserInstance = null;

let cache = {
  time: 0,
  rows: [],
  updatedAt: null,
  source: TARGET_URL
};

function cleanText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload, null, 2));
}

async function getBrowser() {
  if (browserInstance) return browserInstance;

  browserInstance = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ]
  });

  return browserInstance;
}

async function fetchLiveRows() {
  const now = Date.now();

  if (now - cache.time < CACHE_MS && cache.rows.length > 0) {
    return {
      rows: cache.rows,
      updatedAt: cache.updatedAt,
      source: cache.source,
      cached: true
    };
  }

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"
    );

    await page.setViewport({ width: 1440, height: 1600 });

    await page.goto(TARGET_URL, {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    await page.waitForSelector("#home-livetx", {
      timeout: 40000
    });

    await new Promise((resolve) => setTimeout(resolve, 4000));

    const rows = await page.evaluate(() => {
      const result = [];
      const trs = document.querySelectorAll("#home-livetx table tbody tr");

      trs.forEach((tr) => {
        const tds = tr.querySelectorAll("td");
        if (tds.length < 5) return;

        result.push({
          topupPhone: (tds[0]?.innerText || "").trim(),
          topupAmount: (tds[1]?.innerText || "").trim(),
          withdrawPhone: (tds[2]?.innerText || "").trim(),
          withdrawAmount: (tds[3]?.innerText || "").trim(),
          withdrawName: (tds[4]?.innerText || "").trim()
        });
      });

      return result;
    });

    const cleanedRows = rows
      .map((row) => ({
        topupPhone: cleanText(row.topupPhone),
        topupAmount: cleanText(row.topupAmount),
        withdrawPhone: cleanText(row.withdrawPhone),
        withdrawAmount: cleanText(row.withdrawAmount),
        withdrawName: cleanText(row.withdrawName)
      }))
      .filter((row) =>
        row.topupPhone ||
        row.topupAmount ||
        row.withdrawPhone ||
        row.withdrawAmount ||
        row.withdrawName
      );

    cache = {
      time: Date.now(),
      rows: cleanedRows,
      updatedAt: new Date().toISOString(),
      source: TARGET_URL
    };

    return {
      rows: cache.rows,
      updatedAt: cache.updatedAt,
      source: cache.source,
      cached: false
    };
  } finally {
    await page.close();
  }
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".ico": "image/x-icon"
  };

  return types[ext] || "application/octet-stream";
}

function serveStatic(urlPath, res) {
  const safePath = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.normalize(path.join(publicDir, safePath));

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": getContentType(filePath)
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/api/live") {
      try {
        const data = await fetchLiveRows();
        sendJson(res, 200, {
          ok: true,
          ...data
        });
      } catch (error) {
        sendJson(res, 500, {
          ok: false,
          error: error?.message || "Failed to fetch live rows"
        });
      }
      return;
    }

    if (url.pathname === "/api/health") {
      sendJson(res, 200, {
        ok: true,
        message: "Server running",
        target: TARGET_URL,
        cacheAgeMs: cache.time ? Date.now() - cache.time : null
      });
      return;
    }

    serveStatic(url.pathname, res);
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error?.message || "Server error"
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

async function shutdown() {
  try {
    if (browserInstance) {
      await browserInstance.close();
      browserInstance = null;
    }
  } catch (error) {
    console.error("Browser close error:", error.message);
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
