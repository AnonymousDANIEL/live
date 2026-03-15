import http from "http";
import axios from "axios";
import * as cheerio from "cheerio";

const PORT = process.env.PORT || 3000;
const TARGET_URL = "https://bintang44.asia/";

async function fetchLiveRows() {
  const response = await axios.get(TARGET_URL);

  const $ = cheerio.load(response.data);

  const rows = [];

  const trs = $("#home-livetx table tbody tr");

  trs.each((i, tr) => {

    const tds = $(tr).find("td");

    if (tds.length < 5) return;

    rows.push({
      topupPhone: $(tds[0]).text().trim(),
      topupAmount: $(tds[1]).text().trim(),
      withdrawPhone: $(tds[2]).text().trim(),
      withdrawAmount: $(tds[3]).text().trim(),
      withdrawName: $(tds[4]).text().trim()
    });

  });

  return rows;
}

const server = http.createServer(async (req, res) => {

  if (req.url === "/api/live") {

    try {

      const rows = await fetchLiveRows();

      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      });

      res.end(JSON.stringify({
        ok: true,
        rows: rows
      }));

    } catch (err) {

      res.writeHead(500);

      res.end(JSON.stringify({
        ok: false,
        error: err.message
      }));

    }

    return;

  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Server running");

});

server.listen(PORT, () => {

  console.log("Server running on port " + PORT);

});
