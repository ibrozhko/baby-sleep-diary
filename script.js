let currentDate = new Date();
let data = JSON.parse(localStorage.getItem("babyData")) || {};

function getDateKey() {
  return currentDate.toISOString().split("T")[0];
}

function saveData() {
  localStorage.setItem("babyData", JSON.stringify(data));
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatHM(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}г ${m}хв`;
}

function renderDate() {
  document.getElementById("current-date").textContent = currentDate.toLocaleDateString("uk-UA");
}

function renderTables() {
  const dateKey = getDateKey();
  const dayData = data[dateKey] || { sleep: [], feed: [] };

  const sleepTable = document.getElementById("sleep-table").querySelector("tbody");
  const feedTable = document.getElementById("feed-table").querySelector("tbody");

  sleepTable.innerHTML = "";
  feedTable.innerHTML = "";

  dayData.sleep.forEach((s, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span onclick="editSleep(${i}, 'start')">${s.start}</span></td>

      <td><span onclick="editSleep(${i}, 'end')">${s.end || "-"}</span></td>

      <td>${s.duration || "-"}</td>
      <td><img src="icons/cross.svg" style="width:16px;cursor:pointer" onclick="deleteSleep(${i})" /></td>
    `;
    sleepTable.appendChild(tr);
  });

  dayData.feed.forEach((f, i) => {
    const tr = document.createElement("tr");
    const lastFeedTime = new Date(f.time);
    const diff = Date.now() - lastFeedTime.getTime();
    tr.innerHTML = `
      <td><span onclick="editFeed(${i})">${f.display}</span></td>

      <td>${formatHM(diff)}</td>
      <td><img src="icons/cross.svg" style="width:16px;cursor:pointer" onclick="deleteFeed(${i})" /></td>
    `;
    feedTable.appendChild(tr);
  });
}

function deleteSleep(index) {
  const dateKey = getDateKey();
  data[dateKey].sleep.splice(index, 1);
  saveData();
  renderTables();
}
function deleteFeed(index) {
  const dateKey = getDateKey();
  data[dateKey].feed.splice(index, 1);
  saveData();
  renderTables();
}

function updateTimers() {
  const dateKey = getDateKey();
  const dayData = data[dateKey];
  if (!dayData) return;

  const lastSleep = [...dayData.sleep].reverse().find(s => !s.end);
  if (lastSleep) {
    document.getElementById("sleep-status-title").textContent = "Спить вже";
    const start = new Date(`${dateKey}T${lastSleep.start}`);
    const diff = Date.now() - start.getTime();
    document.getElementById("sleep-timer").textContent = formatHM(diff);
  } else {
    const lastAwake = [...dayData.sleep].reverse().find(s => s.end);
    if (lastAwake) {
      document.getElementById("sleep-status-title").textContent = "Грається вже";
      const end = new Date(`${dateKey}T${lastAwake.end}`);
      const diff = Date.now() - end.getTime();
      document.getElementById("sleep-timer").textContent = formatHM(diff);
    }
  }

  const lastFeed = [...dayData.feed].reverse()[0];
  if (lastFeed) {
    const time = new Date(lastFeed.time);
    const diff = Date.now() - time.getTime();
    document.getElementById("feed-timer").textContent = formatHM(diff);
  }
}

setInterval(updateTimers, 60000);

document.getElementById("edit-time").addEventListener("click", () => {
  const newTime = prompt("Введіть новий час (ГГ:ХХ)", "12:00");
  if (newTime) document.getElementById("current-time").textContent = newTime;
});

document.getElementById("sleep-btn").addEventListener("click", () => {
  const dateKey = getDateKey();
  data[dateKey] = data[dateKey] || { sleep: [], feed: [] };
  data[dateKey].sleep.push({ start: formatTime(new Date()) });
  saveData();
  renderTables();
  updateTimers();
});

document.getElementById("wake-btn").addEventListener("click", () => {
  const dateKey = getDateKey();
  const session = [...(data[dateKey]?.sleep || [])].reverse().find(s => !s.end);
  if (session) {
    const now = new Date();
    session.end = formatTime(now);
    const start = new Date(`${dateKey}T${session.start}`);
    session.duration = formatHM(now - start);
    saveData();
    renderTables();
    updateTimers();
  }
});

document.getElementById("feed-btn").addEventListener("click", () => {
  const dateKey = getDateKey();
  data[dateKey] = data[dateKey] || { sleep: [], feed: [] };
  const now = new Date();
  data[dateKey].feed.push({ time: now.toISOString(), display: formatTime(now) });
  saveData();
  renderTables();
  updateTimers();
});

document.getElementById("prev-date").addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() - 1);
  renderDate();
  renderTables();
  updateTimers();
});
document.getElementById("next-date").addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() + 1);
  renderDate();
  renderTables();
  updateTimers();
});

// Початковий запуск
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("current-time").textContent = formatTime(new Date());
  renderDate();
  renderTables();
  updateTimers();
});
function downloadExcel() {
  const dateKey = getDateKey();
  const dayData = data[dateKey];
  if (!dayData) {
    alert("Немає даних для експорту 😢");
    return;
  }

  const sleepSheet = [["Заснув", "Прокинувся", "Тривалість"]];
  const feedSheet = [["Час", "З моменту"]];

  dayData.sleep.forEach(s => {
    sleepSheet.push([s.start, s.end || "-", s.duration || "-"]);
  });

  dayData.feed.forEach(f => {
    const time = new Date(f.time);
    const diff = Date.now() - time.getTime();
    feedSheet.push([f.display, formatHM(diff)]);
  });

  const wb = XLSX.utils.book_new();
  const sleepWS = XLSX.utils.aoa_to_sheet(sleepSheet);
  const feedWS = XLSX.utils.aoa_to_sheet(feedSheet);

  XLSX.utils.book_append_sheet(wb, sleepWS, "Сон");
  XLSX.utils.book_append_sheet(wb, feedWS, "Годування");

  XLSX.writeFile(wb, `baby_sleep_${dateKey}.xlsx`);
}

document.querySelector(".excel-btn").addEventListener("click", downloadExcel);
function editSleep(index, field) {
  const dateKey = getDateKey();
  const value = prompt("Введіть новий час (ГГ:ХХ)", data[dateKey].sleep[index][field] || "");
  if (value) {
    data[dateKey].sleep[index][field] = value;

    // перерахунок тривалості
    const s = data[dateKey].sleep[index];
    if (s.start && s.end) {
      const start = new Date(`${dateKey}T${s.start}`);
      const end = new Date(`${dateKey}T${s.end}`);
      if (end > start) s.duration = formatHM(end - start);
    }

    saveData();
    renderTables();
    updateTimers();
  }
}

function editFeed(index) {
  const dateKey = getDateKey();
  const value = prompt("Введіть новий час (ГГ:ХХ)", data[dateKey].feed[index].display || "");
  if (value) {
    const now = new Date();
    const timeISO = new Date(`${dateKey}T${value}`).toISOString();
    data[dateKey].feed[index] = {
      time: timeISO,
      display: value
    };
    saveData();
    renderTables();
    updateTimers();
  }
}


