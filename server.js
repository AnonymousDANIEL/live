import http from "http";
import fs from "fs";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

const PORT = process.env.PORT || 3000;
const TARGET_URL = "https://bintang44.asia/";
const CACHE_MS = 8000;

let cache = {
  time: 0,
  data: {
    updatedAt: null,
    source: TARGET_URL,
    rows: []
  }
};

function cleanText(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
}

async function fetchLiveRows() {
  const now = Date.now();
  if (now - cache.time < CACHE_MS && cache.data.rows.length) {
    return cache.data;
  }

  const response = await axios.get(TARGET_URL, {
    timeout: 20000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml"
    }
  });

  const $ = cheerio.load(response.data);
  const rows = [];

  // 你截图里的结构：#home-livetx table
  const trs = $("#home-livetx table tbody tr");

  trs.each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 5) return;

    const topupPhone = cleanText($(tds[0]).text());
    const topupAmount = cleanText($(tds[1]).text());
    const withdrawPhone = cleanText($(tds[2]).text());
    const withdrawAmount = cleanText($(tds[3]).text());
    const withdrawName = cleanText($(tds[4]).text());

    if (!topupPhone && !withdrawPhone) return;

    rows.push({
      topupPhone,
      topupAmount,
      withdrawPhone,
      withdrawAmount,
      withdrawName
    });
  });

  const data = {
    updatedAt: new Date().toISOString(),
    source: TARGET_URL,
    rows
  };

  cache = {
    time: now,
    data
  };

  return data;
}

});
