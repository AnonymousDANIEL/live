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

let browser;
let cache = {
  time: 0,
  rows: [],
  updatedAt: null,
  source: TARGET_URL
};

function cleanText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

async function getBrowser() {
  if (browser) return browser;

  browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process"
    ]
  });

  return browser;
}

async function scrapeLiveRows() {
  const now = Date.now();
  if (now - cache.time < CACHE_MS && cache.rows.length) {
    return {
      rows: cache.rows,
      updatedAt: cache.updatedAt,
      source: cache.source,
      cached: true
    };
  }

  const currentBrowser = await getBrowser();
  const page = await currentBrowser.newPage();

});
