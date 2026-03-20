const liveBody = document.getElementById("liveBody");
const syncTime = document.getElementById("syncTime");
const syncState = document.getElementById("syncState");
const tableScroll = document.getElementById("tableScroll");

const previousKeys = new Set();
let autoScrollTimer = null;

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function rowKey(row) {
  return [
    row.topupPhone,
    row.topupAmount,
    row.withdrawPhone,
    row.withdrawAmount,
    row.withdrawName
  ].join("|");
}

function renderRows(rows) {
  if (!rows || !rows.length) {
    liveBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty">No live rows found yet.</td>
      </tr>
    `;
    return;
  }

  const nextKeys = new Set(rows.map(rowKey));

  liveBody.innerHTML = rows.map((row) => {
    const key = rowKey(row);
    const isNew = !previousKeys.has(key);

    return `
      <tr class="${isNew ? "flash-new" : ""}">
        <td>${escapeHtml(row.topupPhone || "-")}</td>
        <td>${escapeHtml(row.topupAmount || "-")}</td>
        <td>${escapeHtml(row.withdrawPhone || "-")}</td>
        <td>${escapeHtml(row.withdrawAmount || "-")}</td>
        <td>${escapeHtml(row.withdrawName || "-")}</td>
      </tr>
    `;
  }).join("");

  previousKeys.clear();
  nextKeys.forEach((key) => previousKeys.add(key));
}

async function loadLive() {
  syncState.textContent = "Status: syncing...";

  try {
    const response = await fetch(`/api/live?t=${Date.now()}`, {
      cache: "no-store"
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Failed to load live data");
    }

    renderRows(data.rows || []);

    const time = data.updatedAt ? new Date(data.updatedAt) : new Date();
    syncTime.textContent = `Last sync: ${time.toLocaleString()}`;
    syncState.textContent = `Status: ${data.cached ? "cache" : "live fetch"}`;
  } catch (error) {
    syncState.textContent = `Status: error`;
    liveBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty">Sync failed: ${escapeHtml(error.message)}</td>
      </tr>
    `;
  }
}

function startAutoScroll() {
  if (autoScrollTimer) return;
startAutoScroll();
