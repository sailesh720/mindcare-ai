"""
MindCare – AI Mental Health Companion for Students
====================================================
Flask backend that powers the chatbot, mood tracker,
study schedule generator, and dashboard analytics.

HOW TO RUN:
  1. Install dependencies:  pip install flask flask-cors openai python-dotenv
  2. Add your API key to a .env file:  OPENAI_API_KEY=sk-...
  3. Run the server:  python app.py
  4. Open http://localhost:5000 in your browser
"""

import os
import json
import random
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

# ── Optional: load environment variables from a .env file ──────────────────
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed – set env vars manually

# ── Optional: OpenAI client (gracefully disabled if not installed) ──────────
try:
    from openai import OpenAI
    openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))
    OPENAI_AVAILABLE = bool(os.environ.get("OPENAI_API_KEY"))
except ImportError:
    openai_client = None
    OPENAI_AVAILABLE = False

# ── App setup ──────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from the frontend

# ── In-memory "database" (replace with SQLite/PostgreSQL for production) ───
# Stores mood entries as: {"date": "2024-01-15", "mood": "happy", "score": 4}
mood_history = []

# Mood → numeric score mapping (used for the Chart.js graph)
MOOD_SCORES = {
    "happy":   4,
    "calm":    3,
    "tired":   2,
    "stressed":1,
    "anxious": 1,
}

# ── Mental-health system prompt sent to the AI ─────────────────────────────
SYSTEM_PROMPT = """You are MindCare, a warm and compassionate AI mental health companion 
designed specifically for university and high-school students. Your role is to:

- Listen with empathy and without judgment
- Provide evidence-based coping strategies for stress and anxiety
- Offer gentle, actionable advice for academic pressure
- Encourage healthy habits (sleep, exercise, breaks, social connection)
- Remind students of campus resources when appropriate
- NEVER diagnose, prescribe, or replace professional mental health care
- If a student expresses thoughts of self-harm, always provide crisis resources:
  Crisis Text Line: Text HOME to 741741 | National Suicide Prevention Lifeline: 988

Keep responses concise (2–4 sentences), warm, and practical.
Use simple language. Avoid clinical jargon."""


# ══════════════════════════════════════════════════════════════════════════════
#  PAGE ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/")
def index():
    """Serve the main chat + mood-tracker page."""
    return render_template("index.html")


@app.route("/dashboard")
def dashboard():
    """Serve the analytics dashboard page."""
    return render_template("dashboard.html")


# ══════════════════════════════════════════════════════════════════════════════
#  API ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/chat", methods=["POST"])
def chat():
    """
    Chatbot endpoint.
    Expects JSON: { "message": "I'm really stressed about exams" }
    Returns JSON: { "reply": "..." }
    """
    data = request.get_json()
    user_message = data.get("message", "").strip()

    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    # ── Use OpenAI if available, otherwise fall back to rule-based replies ──
    if OPENAI_AVAILABLE and openai_client:
        try:
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",          # affordable, fast model
                messages=[
                    {"role": "system",  "content": SYSTEM_PROMPT},
                    {"role": "user",    "content": user_message},
                ],
                max_tokens=200,
                temperature=0.7,
            )
            reply = response.choices[0].message.content.strip()
        except Exception as e:
            # If API call fails, fall back gracefully
            reply = get_fallback_reply(user_message)
    else:
        # No API key – use smart keyword-based fallback responses
        reply = get_fallback_reply(user_message)

    return jsonify({"reply": reply})


@app.route("/api/mood", methods=["POST"])
def log_mood():
    """
    Log today's mood.
    Expects JSON: { "mood": "stressed" }
    Returns JSON: { "success": true, "entry": {...} }
    """
    data = request.get_json()
    mood = data.get("mood", "").lower().strip()

    if mood not in MOOD_SCORES:
        return jsonify({"error": f"Invalid mood. Choose from: {list(MOOD_SCORES.keys())}"}), 400

    entry = {
        "date":  datetime.now().strftime("%Y-%m-%d"),
        "time":  datetime.now().strftime("%H:%M"),
        "mood":  mood,
        "score": MOOD_SCORES[mood],
    }
    mood_history.append(entry)

    return jsonify({"success": True, "entry": entry})


@app.route("/api/mood/history", methods=["GET"])
def get_mood_history():
    """
    Return the last 14 days of mood data for the chart.
    Returns JSON: { "history": [...], "summary": {...} }
    """
    # Seed some demo data if history is empty (so the chart isn't blank)
    if not mood_history:
        _seed_demo_data()

    # Build a clean list for Chart.js (last 14 entries max)
    recent = mood_history[-14:]

    summary = {
        "total_entries": len(mood_history),
        "average_score": round(sum(e["score"] for e in mood_history) / len(mood_history), 1),
        "most_common":   max(set(e["mood"] for e in mood_history),
                             key=lambda m: sum(1 for e in mood_history if e["mood"] == m)),
    }

    return jsonify({"history": recent, "summary": summary})


@app.route("/api/study-schedule", methods=["POST"])
def study_schedule():
    """
    Generate a simple study schedule.
    Expects JSON: { "subject": "Calculus", "exam_date": "2024-02-10", "hours_per_day": 2 }
    Returns JSON: { "schedule": [...] }
    """
    data        = request.get_json()
    subject     = data.get("subject", "Your Subject")
    exam_date   = data.get("exam_date", "")
    hours_daily = int(data.get("hours_per_day", 2))

    try:
        exam_dt = datetime.strptime(exam_date, "%Y-%m-%d")
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    today     = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    days_left = (exam_dt - today).days

    if days_left <= 0:
        return jsonify({"error": "Exam date must be in the future"}), 400

    # Simple schedule: split study topics across available days
    topics = [
        "Review notes & syllabus overview",
        "Core concepts deep-dive (Part 1)",
        "Core concepts deep-dive (Part 2)",
        "Practice problems & exercises",
        "Past papers / mock questions",
        "Weak areas revision",
        "Final review & summary notes",
        "Rest & light revision only",
    ]

    schedule = []
    for i in range(min(days_left, 14)):   # show up to 14 days
        day_date = today + timedelta(days=i)
        topic    = topics[i % len(topics)]

        # Taper study hours as exam approaches
        if i == days_left - 1:
            hrs = 1
            tip = "🌙 Rest well tonight – you've prepared!"
        elif days_left - i <= 2:
            hrs = max(1, hours_daily - 1)
            tip = "✅ Light review only, protect your sleep"
        else:
            hrs = hours_daily
            tip = random.choice([
                "🍅 Use Pomodoro: 25 min study, 5 min break",
                "💧 Stay hydrated while studying",
                "📱 Put your phone in another room",
                "🎵 Try lo-fi music to stay focused",
                "🚶 Take a 10-min walk between sessions",
            ])

        schedule.append({
            "day":     i + 1,
            "date":    day_date.strftime("%b %d, %Y"),
            "weekday": day_date.strftime("%A"),
            "topic":   f"{subject}: {topic}",
            "hours":   hrs,
            "tip":     tip,
        })

    return jsonify({
        "schedule":   schedule,
        "days_left":  days_left,
        "total_hours": sum(s["hours"] for s in schedule),
    })


@app.route("/api/tips", methods=["GET"])
def stress_tips():
    """Return a random set of mental health / study tips for the dashboard."""
    all_tips = [
        {"icon": "🧘", "title": "Box Breathing",       "body": "Inhale 4s → Hold 4s → Exhale 4s → Hold 4s. Repeat 4× to calm your nervous system instantly."},
        {"icon": "😴", "title": "Protect Your Sleep",  "body": "Aim for 7–9 hours. Sleep consolidates memory – pulling an all-nighter before an exam backfires."},
        {"icon": "🏃", "title": "Move Your Body",      "body": "Even a 20-minute walk releases endorphins and reduces cortisol by up to 26%."},
        {"icon": "📵", "title": "Phone-Free Mornings", "body": "Wait 30 minutes before checking your phone. It dramatically reduces anxiety spikes."},
        {"icon": "✍️", "title": "Brain Dump",          "body": "Feeling overwhelmed? Write every worry on paper. Externalising thoughts reduces mental load."},
        {"icon": "🤝", "title": "Talk to Someone",     "body": "Social connection is the #1 buffer against stress. Text a friend – even one message helps."},
        {"icon": "🌿", "title": "5-4-3-2-1 Grounding", "body": "Name 5 things you see, 4 you hear, 3 you can touch, 2 you smell, 1 you taste. Stops panic fast."},
        {"icon": "🎯", "title": "Tiny Wins",           "body": "Break tasks into 15-minute chunks. Each completion releases dopamine and builds momentum."},
    ]
    # Return 4 random tips
    return jsonify({"tips": random.sample(all_tips, 4)})


# ══════════════════════════════════════════════════════════════════════════════
#  HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def get_fallback_reply(message: str) -> str:
    """
    Rule-based fallback when no OpenAI key is set.
    Matches keywords and returns a relevant supportive response.
    """
    msg = message.lower()

    # Crisis detection – always highest priority
    crisis_words = ["suicide", "kill myself", "end my life", "self-harm", "hurt myself", "don't want to live"]
    if any(w in msg for w in crisis_words):
        return ("I'm really glad you reached out. Please know you're not alone. "
                "If you're in crisis, please contact the 988 Suicide & Crisis Lifeline "
                "(call or text 988) or text HOME to 741741 right now. 💙")

    # Keyword → response map
    responses = {
        ("exam", "test", "quiz", "finals"):
            "Exam stress is so real, and your feelings are completely valid. "
            "Try breaking your study sessions into 25-minute Pomodoro blocks with short breaks. "
            "You know more than you think – trust your preparation! 📚",

        ("anxious", "anxiety", "panic", "nervous", "worry"):
            "When anxiety hits, try box breathing: inhale for 4 counts, hold 4, exhale 4, hold 4. "
            "Repeat a few times. Your nervous system will actually calm down physiologically. "
            "You're safe right now. 🌿",

        ("stressed", "overwhelmed", "too much", "pressure"):
            "It sounds like you're carrying a lot right now. "
            "Take one slow breath and ask: what's the *one* thing that matters most today? "
            "Doing just that one thing is enough. You don't have to solve everything at once. 💙",

        ("tired", "exhausted", "sleep", "no energy"):
            "Your body is asking for rest – that's important data, not weakness. "
            "Even a 20-minute nap can restore focus. If you're consistently exhausted, "
            "that's a sign to protect your sleep schedule more fiercely. 😴",

        ("sad", "depressed", "lonely", "unhappy", "crying"):
            "I hear you, and I'm really glad you're sharing this. "
            "Feeling sad doesn't mean something is permanently wrong – it means you're human. "
            "Is there one small thing that usually brings you even a tiny bit of comfort? 🤍",

        ("happy", "great", "good", "amazing", "excited"):
            "That's wonderful to hear! 🌟 Positive emotions are worth savouring – "
            "take a moment to notice what's going well. How are you planning to keep this momentum going?",

        ("procrastinating", "procrastinate", "cant start", "can't focus", "distracted"):
            "The hardest part is always starting. Try the '2-minute rule': "
            "just open your notes for 2 minutes. Often that's all it takes to get into flow. "
            "Remove your phone from the room – it's the #1 focus killer. 🎯",
    }

    for keywords, reply in responses.items():
        if any(k in msg for k in keywords):
            return reply

    # Generic warm fallback
    generic = [
        "Thank you for sharing that with me. Whatever you're going through, "
        "you don't have to face it alone. What's been weighing on you most today?",
        "I'm here and listening. Student life can be incredibly intense – "
        "your feelings make complete sense. Would you like to talk through what's on your mind?",
        "That sounds really challenging. You're being incredibly brave by reaching out. "
        "What would feel most helpful right now – venting, advice, or just someone to listen?",
    ]
    return random.choice(generic)


def _seed_demo_data():
    """Populate mood_history with 10 days of sample data for a nicer first load."""
    sample_moods = ["happy", "stressed", "tired", "calm", "anxious",
                    "happy", "stressed", "happy", "tired", "calm"]
    for i, mood in enumerate(sample_moods):
        day = datetime.now() - timedelta(days=len(sample_moods) - i)
        mood_history.append({
            "date":  day.strftime("%Y-%m-%d"),
            "time":  "09:00",
            "mood":  mood,
            "score": MOOD_SCORES[mood],
        })


# ══════════════════════════════════════════════════════════════════════════════
import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
