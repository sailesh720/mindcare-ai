/**
 * MindCare – Frontend JavaScript
 * ================================
 * Handles: chatbot, mood tracker, study scheduler, dashboard charts & tips.
 * All API calls go to the Flask backend at the same origin (/api/...).
 */

"use strict";

/* ══════════════════════════════════════════════════════════════════════════
   SHARED UTILITIES
   ══════════════════════════════════════════════════════════════════════════ */

/** Format current time as HH:MM for message timestamps */
function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Show or hide an element */
function toggle(id, show) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle("hidden", !show);
}

/* ══════════════════════════════════════════════════════════════════════════
   CHATBOT
   ══════════════════════════════════════════════════════════════════════════ */

/** Append a message bubble to the chat window */
function appendMessage(text, role) {
  const container = document.getElementById("chatMessages");
  if (!container) return;

  const wrap = document.createElement("div");
  wrap.className = `message ${role}`;

  wrap.innerHTML = `
    <div class="msg-bubble">
      ${escapeHtml(text)}
      <span class="msg-time">${now()}</span>
    </div>`;

  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;   // auto-scroll to bottom
}

/** Show animated "typing…" indicator while waiting for the AI */
function showTyping() {
  const container = document.getElementById("chatMessages");
  const indicator = document.createElement("div");
  indicator.className = "message bot";
  indicator.id = "typingIndicator";
  indicator.innerHTML = `
    <div class="msg-bubble">
      <div class="typing-dots">
        <span></span><span></span><span></span>
      </div>
    </div>`;
  container.appendChild(indicator);
  container.scrollTop = container.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById("typingIndicator");
  if (el) el.remove();
}

/** Send a message to the backend chatbot API */
async function sendMessage() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) return;

  appendMessage(message, "user");
  input.value = "";
  showTyping();

  try {
    const res  = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    hideTyping();
    appendMessage(data.reply || "Sorry, I couldn't process that.", "bot");
  } catch (err) {
    hideTyping();
    appendMessage("⚠️ Could not reach the server. Please make sure Flask is running.", "bot");
  }
}

/** Handle Enter key in the chat input */
document.addEventListener("DOMContentLoaded", () => {
  const chatInput = document.getElementById("chatInput");
  if (chatInput) {
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // Show welcome message on chat page
  const chatMessages = document.getElementById("chatMessages");
  if (chatMessages) {
    setTimeout(() => {
      appendMessage(
        "👋 Hi there! I'm MindCare, your AI mental health companion. " +
        "How are you feeling today? You can talk to me about stress, exams, or anything on your mind — no judgment here. 💙",
        "bot"
      );
    }, 400);
  }

  // Load mood chart on chat page
  loadMoodChart("moodChart");
});

/** Fill the chat input when a quick-prompt chip is clicked */
function usePrompt(btn) {
  const input = document.getElementById("chatInput");
  if (input) {
    // Strip emoji and use as prompt seed
    input.value = btn.textContent.replace(/^[^\w]+/, "").trim();
    input.focus();
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   MOOD TRACKER
   ══════════════════════════════════════════════════════════════════════════ */

/** Maps mood → supportive message shown after logging */
const MOOD_MESSAGES = {
  happy:    "🌟 Wonderful! Savour this feeling — you deserve it.",
  calm:     "😌 That's a great place to be. Keep nurturing that peace.",
  tired:    "😴 Your body is asking for rest. Try a short break or power nap.",
  stressed: "💙 It's okay to feel stressed. Try 5 deep breaths right now.",
  anxious:  "🤍 Anxiety is your body trying to protect you. You're safe. Breathe slowly.",
};

/** Send mood to backend, update UI */
async function logMood(btn) {
  // Highlight selected button
  document.querySelectorAll(".mood-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");

  const mood = btn.dataset.mood;

  try {
    await fetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood }),
    });
  } catch (err) {
    console.warn("Could not log mood:", err);
  }

  // Show supportive feedback text
  const feedback = document.getElementById("moodFeedback");
  if (feedback) {
    feedback.textContent = MOOD_MESSAGES[mood] || "✅ Mood logged!";
    feedback.classList.remove("hidden");
  }

  // Refresh the mini mood chart
  loadMoodChart("moodChart");
}

/* ── Mood Chart ─────────────────────────────────────────────────────────── */

let moodChartInstance = null;   // keep reference so we can destroy/rebuild

/** Fetch mood history and render (or update) the Chart.js line chart */
async function loadMoodChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  let history = [];
  try {
    const res  = await fetch("/api/mood/history");
    const data = await res.json();
    history = data.history || [];
  } catch (err) {
    return;
  }

  const labels = history.map(e => e.date.slice(5));   // "MM-DD"
  const scores = history.map(e => e.score);

  // Destroy previous instance if canvas is being reused
  if (moodChartInstance) { moodChartInstance.destroy(); moodChartInstance = null; }

  moodChartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Mood Score",
        data: scores,
        borderColor: "#64ffda",
        backgroundColor: "rgba(100,255,218,0.08)",
        pointBackgroundColor: "#64ffda",
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0, max: 5,
          ticks: { color: "#8899aa", stepSize: 1, font: { size: 11 } },
          grid: { color: "rgba(255,255,255,0.05)" },
        },
        x: {
          ticks: { color: "#8899aa", font: { size: 11 }, maxTicksLimit: 7 },
          grid: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const scoreMap = { 4:"😊 Happy", 3:"😌 Calm", 2:"😴 Tired", 1:"😣 Low" };
              return scoreMap[ctx.parsed.y] || `Score: ${ctx.parsed.y}`;
            },
          },
        },
      },
    },
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   STUDY SCHEDULE GENERATOR
   ══════════════════════════════════════════════════════════════════════════ */

async function generateSchedule() {
  const subject     = document.getElementById("subjectInput")?.value.trim() || "General";
  const examDate    = document.getElementById("examDate")?.value;
  const hoursPerDay = document.getElementById("hoursPerDay")?.value || "2";

  if (!examDate) {
    alert("Please select your exam date first.");
    return;
  }

  const output = document.getElementById("scheduleOutput");
  if (output) {
    output.classList.remove("hidden");
    output.innerHTML = `<p style="color:var(--text-mid);font-size:0.85rem;">⏳ Building your plan...</p>`;
  }

  try {
    const res  = await fetch("/api/study-schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, exam_date: examDate, hours_per_day: hoursPerDay }),
    });
    const data = await res.json();

    if (data.error) {
      output.innerHTML = `<p style="color:var(--danger)">${escapeHtml(data.error)}</p>`;
      return;
    }

    // Build HTML for the schedule list
    let html = `
      <div class="schedule-summary">
        📌 <strong>${data.days_left} days</strong> until your exam •
        Total study time: <strong>${data.total_hours}h</strong>
      </div>`;

    data.schedule.forEach(item => {
      html += `
        <div class="schedule-item">
          <div class="sched-day">D${item.day}</div>
          <div class="sched-info">
            <div class="sched-date">${item.weekday}, ${item.date}</div>
            <div class="sched-topic">${escapeHtml(item.topic)}</div>
            <div class="sched-tip">${item.tip}</div>
          </div>
          <div class="sched-hours">${item.hours}h</div>
        </div>`;
    });

    output.innerHTML = html;
  } catch (err) {
    output.innerHTML = `<p style="color:var(--danger)">⚠️ Could not generate schedule. Is Flask running?</p>`;
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════════════════════════════════ */

/** Called from dashboard.html after DOM is ready */
async function initDashboard() {
  await loadDashboardStats();
  await loadTrendChart();
  await loadDonutChart();
  await loadTips();
}

/** Fetch summary stats and populate the four stat cards */
async function loadDashboardStats() {
  try {
    const res  = await fetch("/api/mood/history");
    const data = await res.json();
    const s    = data.summary || {};

    document.getElementById("statEntries").textContent = s.total_entries ?? "–";
    document.getElementById("statAvg").textContent     = s.average_score ?? "–";
    document.getElementById("statMood").textContent    =
      s.most_common ? s.most_common.charAt(0).toUpperCase() + s.most_common.slice(1) : "–";

    // Streak: count consecutive unique recent dates (simplified)
    const history = data.history || [];
    const uniqueDates = [...new Set(history.map(e => e.date))];
    document.getElementById("statStreak").textContent = uniqueDates.length + " days";
  } catch (err) {
    console.warn("Stats load failed:", err);
  }
}

/** Large 14-day trend line chart */
async function loadTrendChart() {
  const canvas = document.getElementById("trendChart");
  if (!canvas) return;

  let history = [];
  try {
    const res  = await fetch("/api/mood/history");
    const data = await res.json();
    history    = data.history || [];
  } catch (err) { return; }

  const MOOD_COLORS = { happy:"#6bcb77", calm:"#64ffda", tired:"#ffb347", stressed:"#ff6b6b", anxious:"#c77dff" };

  new Chart(canvas, {
    type: "line",
    data: {
      labels: history.map(e => e.date.slice(5)),
      datasets: [{
        label: "Mood Score",
        data: history.map(e => e.score),
        borderColor: "#64ffda",
        backgroundColor: ctx => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 260);
          gradient.addColorStop(0, "rgba(100,255,218,0.25)");
          gradient.addColorStop(1, "rgba(100,255,218,0)");
          return gradient;
        },
        pointBackgroundColor: history.map(e => MOOD_COLORS[e.mood] || "#64ffda"),
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.45,
        fill: true,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0, max: 5,
          ticks: {
            color: "#8899aa",
            callback: v => ["", "😣", "😴", "😌", "😊", "🌟"][v] || v,
            font: { size: 12 },
          },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
        x: {
          ticks: { color: "#8899aa", font: { size: 11 }, maxTicksLimit: 10 },
          grid: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const entry = history[ctx.dataIndex];
              return `Mood: ${entry?.mood || "?"} (${ctx.parsed.y}/4)`;
            },
          },
        },
      },
    },
  });
}

/** Doughnut chart showing mood distribution */
async function loadDonutChart() {
  const canvas = document.getElementById("donutChart");
  if (!canvas) return;

  let history = [];
  try {
    const res  = await fetch("/api/mood/history");
    const data = await res.json();
    history    = data.history || [];
  } catch (err) { return; }

  // Count occurrences of each mood
  const counts = {};
  history.forEach(e => { counts[e.mood] = (counts[e.mood] || 0) + 1; });

  const moods  = Object.keys(counts);
  const values = moods.map(m => counts[m]);
  const COLORS  = { happy:"#6bcb77", calm:"#64ffda", tired:"#ffb347", stressed:"#ff6b6b", anxious:"#c77dff" };
  const colors  = moods.map(m => COLORS[m] || "#8899aa");

  new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: moods,
      datasets: [{ data: values, backgroundColor: colors, borderColor: "#161c26", borderWidth: 3 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: { legend: { display: false } },
    },
  });

  // Render custom legend
  const legendWrap = document.getElementById("legendWrap");
  if (legendWrap) {
    legendWrap.innerHTML = moods.map((m, i) => `
      <div class="legend-item">
        <div class="legend-dot" style="background:${colors[i]}"></div>
        <span>${m.charAt(0).toUpperCase() + m.slice(1)} (${values[i]})</span>
      </div>`).join("");
  }
}

/** Fetch and render stress/wellbeing tips */
async function loadTips() {
  const grid = document.getElementById("tipsGrid");
  if (!grid) return;

  try {
    const res  = await fetch("/api/tips");
    const data = await res.json();

    grid.innerHTML = (data.tips || []).map(tip => `
      <div class="tip-item">
        <div class="tip-icon">${tip.icon}</div>
        <div class="tip-title">${escapeHtml(tip.title)}</div>
        <div class="tip-body">${escapeHtml(tip.body)}</div>
      </div>`).join("");
  } catch (err) {
    grid.innerHTML = `<p style="color:var(--text-mid)">Could not load tips.</p>`;
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   SECURITY HELPER
   ══════════════════════════════════════════════════════════════════════════ */

/** Escape user-supplied text before injecting into innerHTML */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
