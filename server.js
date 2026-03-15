import http from "http";
import puppeteer from "puppeteer";

const PORT = process.env.PORT || 3000;

async function fetchLiveRows() {

  const browser = await puppeteer.launch({
    args: ["--no-sandbox"]
  });

  const page = await browser.newPage();

  await page.goto("https://bintang44.asia/", {
    waitUntil: "networkidle2"
  });

  await page.waitForSelector("#home-livetx");

  const rows = await page.evaluate(() => {

    const data = [];

    const trs = document.querySelectorAll("#home-livetx table tbody tr");

    trs.forEach(tr => {

      const td = tr.querySelectorAll("td");

      if (td.length < 5) return;

      data.push({
        topupPhone: td[0].innerText.trim(),
        topupAmount: td[1].innerText.trim(),
        withdrawPhone: td[2].innerText.trim(),
        withdrawAmount: td[3].innerText.trim(),
        withdrawName: td[4].innerText.trim()
      });

    });

    return data;

  });

  await browser.close();

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
        rows
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

  res.writeHead(200);
  res.end("Server running");

});

server.listen(PORT, () => {

  console.log("Server running on port " + PORT);

});
