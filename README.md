# Koushole - কৌশলে 🚀

> **Study Smarter - পড়া হবে কৌশলে**  
> *Your Personal AI-Powered Study Companion.*

![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)
![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

**Koushole** is a next-generation EdTech platform built for the **MillionX Bangladesh National AI Build-a-thon 2026**. It merges the power of advanced Large Language Models (LLMs) with the official NCTB curriculum to create a hyper-personalized, gamified, and accessible learning experience for every student in Bangladesh.

🔗 **Live Demo**: [koushole.vercel.app](https://koushole.vercel.app)

---

## 🏗️ AI Architecture & Innovation

Koushole employs a sophisticated **Agentic AI Architecture** to deliver real-time, adaptive tutoring.

### 1. The "Socratic" Chat Tutor 🗣️
-   **Goal**: Teach, don't just solve.
-   **Flow**: `User Input` → `Orchestrator` → **Llama 4 Scout (Groq)** → `Adaptive Output`
-   **Innovation**: Uses "Peak-to-Bottom" reasoning to break down complex topics into first principles, switching seamlessly between English and Bangla.

### 2. "Pure AI" Quiz Generator 🧠
-   **Goal**: Infinite practice material.
-   **Flow**: `Subject Selection` → `JSON Schema Prompt` → **Llama 4 Scout** → `Frontend Rendering`
-   **Innovation**: Generates unique, curriculum-aligned questions on the fly without relying on static question banks.

### 3. "Diagram" Visualization Engine 🎨
-   **Goal**: Visual learning on demand.
-   **Flow**: `Intent: "Draw..."` → `Prompt Refinement` → **FLUX.1-schnell (HF)** → `Visual Output`
-   **Innovation**: Instantly generates scientific diagrams within the chat interface.

---

## ✨ Key Features

### 📚 Library & Content
| Feature | Description |
|---------|-------------|
| **Official NCTB Books** | Admin-uploaded textbooks organized by Class & Subject |
| **Custom Library** | Upload your own PDFs, EPUBs, or even **photos of offline books** |
| **Group-Based Subjects** | Science, Business Studies, Humanities - all Class 9-12 |
| **Progress Tracking** | Real-time upload progress bar with percentage |

### 📝 Smart Assessment
- **Adaptive Quizzes**: MCQ, Fill-in-the-Blank, Matching, and Reordering
- **Subject-Specific**: Dynamically filters subjects based on your group/class
- **Remedial Loops**: Khan Academy video suggestions *(🚧 Coming Soon)*

### 🎮 Gamification
- **XP & Leaderboards**: Earn experience for every correct answer
- **Daily Streaks**: Build consistent study habits
- **Badges**: Unlock achievements like "Week Warrior" and "Topic Master"
- **Learning Charts**: Track your progress over time

### 🌏 Accessibility
- **Bilingual UI**: Complete English/বাংলা toggle
- **Voice-First**: Speech-to-text support for questions
- **Dark Mode**: Premium OLED-friendly dark theme

---

## 🔐 Admin Panel

A secure admin panel for uploading official NCTB resources.

### Access
- **URL**: `https://yourdomain.com/admin.html`
- **Authorized Emails**: Only whitelisted emails can upload (configured in `admin.js`)

### How to Upload NCTB Books

1. **Login** to the main app with your admin email
2. Navigate to `/admin.html`
3. **Select Options**:
   | Field | Example |
   |-------|---------|
   | Group | Science, Business Studies, Humanities |
   | Version | Bangla Medium / English Version |
   | Class | Class 9, 10, 9-10 (Both), HSC 11, 12, 11-12 (Both) |
   | Subject | Physics, Chemistry, Higher Mathematics, etc. |
4. **Choose PDF File** (any size supported)
5. Click **Upload Book**
6. Watch the progress bar complete ✅

### Book Title Format
Titles are auto-generated:
```
Physics - Class 9-10 [Science] (Bangla Medium)
Economics - Class 11 [Humanities] (English Version)
```

### Adding New Admin Emails
Edit `admin.js` line ~80:
```javascript
const ALLOWED_ADMINS = [
    'admin@example.com',
    'your-email@example.com'  // Add here
];
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Supabase Account
- Groq API Key
- Hugging Face API Key

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/KawserMahamudJunyed/MXB2026-Dhaka-Tensorithm-Koushole.git
    cd koushole-app
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory:
    ```env
    GROQ_API_KEY=your_groq_key
    HF_API_KEY=your_huggingface_key
    ```

4.  **Run Locally**
    ```bash
    npm start
    ```
    Visit `http://localhost:3000`

---

## 🗄️ Database Setup

Run these SQL scripts in Supabase SQL Editor:

1. **Profiles & Auth Tables** - `database_schema.sql`
2. **Official Resources** - `official_resources_schema.sql`
3. **Chat History** - `chat_history_schema.sql`
4. **Storage Buckets** - Create `books` and `official-books` buckets

> ⚠️ **Supabase Free Tier Limitation**: Maximum file upload size is **50 MB**. For larger files, upgrade to a paid plan or compress PDFs before uploading.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | Vanilla JS, Tailwind CSS, HTML5 |
| **Backend** | Supabase (Auth, DB, Storage, RLS) |
| **Orchestration** | Vercel Serverless Functions |
| **AI (Logic)** | Llama 4 Scout (via Groq) |
| **AI (Vision)** | FLUX.1-schnell (via Hugging Face) |

---

## 📂 Project Structure

```
koushole-app/
├── api/                    # Vercel serverless functions
│   ├── chat.js             # AI chat endpoint
│   ├── generate-quiz.js    # Quiz generation
│   └── generate-image.js   # Image generation
├── public/
│   ├── index.html          # Main app
│   ├── admin.html          # Admin panel
│   ├── js/
│   │   ├── app.js          # Main app logic
│   │   ├── admin.js        # Admin panel logic
│   │   ├── subjects.js     # NCTB subject lists
│   │   ├── quiz.js         # Quiz functionality
│   │   └── supabase-config.js
│   └── css/
└── vercel.json             # Deployment config
```

---

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

### 🚀 *Powered by Team Tensorithm*
**MillionX Bangladesh National AI Build-a-thon 2026**

*Building the future of education, one student at a time.* 🇧🇩
