# MindCare – AI Mental Health Companion for Students 🧠

A full-stack web application to help students manage stress, anxiety, and academic pressure
with an AI chatbot, mood tracker, study schedule generator, and wellness dashboard.

---

## 📁 Project Structure

```
mindcare/
├── app.py                  ← Flask backend (all API routes)
├── requirements.txt        ← Python dependencies
├── .env.example            ← API key template
├── templates/
│   ├── index.html          ← Chat + Mood Tracker page
│   └── dashboard.html      ← Analytics Dashboard page
└── static/
    ├── style.css           ← Dark-theme stylesheet
    └── script.js           ← All frontend logic + Chart.js
```

---

## ⚡ Quick Start

### 1. Install Python dependencies

```bash
cd mindcare
pip install flask flask-cors openai python-dotenv
```

Or install from the requirements file:

```bash
pip install -r requirements.txt
```

### 2. Add your OpenAI API key (optional but recommended)

Copy the example file:

```bash
cp .env.example .env
```

Edit `.env` and paste your key:

```
OPENAI_API_KEY=sk-your-key-here
```

> **No key?** No problem! The app includes smart rule-based fallback responses so it works out-of-the-box without any API key.

### 3. Run the server

```bash
python app.py
```

### 4. Open in your browser

```
http://localhost:5000
```

---

## 🔑 Getting an OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an account and add a payment method
3. Navigate to **API Keys** → **Create new secret key**
4. Copy the key and paste it into your `.env` file

> The app uses `gpt-4o-mini` which costs ~$0.15 per 1M tokens – very affordable for student use.

---

## 🌟 Features

| Feature | Description |
|---|---|
| 🤖 AI Chatbot | Supportive mental health conversations powered by GPT-4o-mini |
| 😊 Mood Tracker | Log daily mood; visualised with Chart.js line chart |
| 📅 Study Scheduler | Enter exam date → get a personalised revision plan |
| 📊 Dashboard | 14-day mood trend, breakdown chart, wellbeing tips |
| 🌙 Dark Theme | Modern dark UI, responsive for mobile & desktop |

---

## 🚨 Important Safety Note

MindCare is an **educational tool** and does **not** replace professional mental health care.

If you or someone you know is in crisis:
- **988 Suicide & Crisis Lifeline**: call or text **988**
- **Crisis Text Line**: text **HOME** to **741741**

---

## 🔧 Tech Stack

- **Backend**: Python 3.8+ / Flask / Flask-CORS
- **AI**: OpenAI GPT-4o-mini (with keyword fallback)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Charts**: Chart.js 4
- **Fonts**: Sora + DM Serif Display (Google Fonts)
- **Storage**: In-memory (upgrade to SQLite for persistence)

---

## 🗄️ Upgrading to a Real Database (optional)

The mood history is stored in a Python list (resets on server restart).
To persist data, replace the `mood_history` list in `app.py` with SQLite:

```python
import sqlite3

def get_db():
    conn = sqlite3.connect("mindcare.db")
    conn.row_factory = sqlite3.Row
    return conn
```

---

## 🛠️ Customisation Tips

- **Change AI personality**: Edit `SYSTEM_PROMPT` in `app.py`
- **Add more moods**: Update `MOOD_SCORES` dict and the HTML mood buttons
- **Use Gemini instead of OpenAI**: Replace the OpenAI calls with `google-generativeai` SDK
- **Deploy to the web**: Works with Render, Railway, or any Python host
