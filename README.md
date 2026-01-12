# Koushole - কৌশলে 🚀

> **Study Smarter - পড়া হবে কৌশলে**  
> *Your Personal AI-Powered Study Companion.*

![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
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
-   **Flow**: `Intent: "Draw..."` → `Prompt Refinement` → **FLUX.1-dev (HF)** → `Visual Output`
-   **Innovation**: Instantly generates scientific diagrams within the chat interface.

### 4. Book OCR & Chapter Extraction 📖
-   **Goal**: Process scanned textbooks.
-   **Flow**: `PDF Upload` → **Gemini 2.0 Flash** → `Chapter Detection` → `Database Storage`
-   **Innovation**: Extracts chapters from scanned Bangla PDFs with auto-retry on rate limits.

---

## ✨ Key Features

### 📚 Library & Content
| Feature | Description |
|---------|-------------|
| **Official NCTB 2026 Books** | Admin-uploaded textbooks aligned with the latest NCTB curriculum |
| **Custom Library** | Upload PDFs, EPUBs, TXT, or **photos of offline books** (JPG, PNG) |
| **Complete Curriculum** | Class 6-8, SSC (Class 9-10) & HSC (Class 11-12) with all subjects & chapters |
| **Group-Based Filtering** | Science, Business Studies, Humanities - content filtered per student |
| **University Support** | Department-based profiles for higher education students |
| **Gemini Vision OCR** | Extract chapters from scanned PDFs using AI vision 🆕 |
| **Library Quiz Integration** | Take quizzes directly from your uploaded books 🆕 |

### 📝 Smart Assessment
| Feature | Description |
|---------|-------------|
| **Chapter-Based Quizzes** | Select specific chapters from any subject for targeted practice |
| **Custom Question Count** | Choose 5, 10, 15, 20, 25, or enter custom (1-50) questions |
| **Adaptive Difficulty** | AI adjusts based on student accuracy and learning history |
| **Question Variety** | MCQ, Fill-in-the-Blank, Matching, Ordering, and Voice Answer |
| **Student Observation** | Tracks performance and targets weak areas automatically |
| **Khan Academy** | Video suggestions for remedial learning *(🚧 Coming Soon)* |

### 🎮 Gamification
| Feature | Description |
|---------|-------------|
| **XP System** | Earn experience points for every correct answer |
| **Daily Streaks** | Build consistent study habits with streak tracking |
| **Performance Greetings** | Motivational messages based on your progress |
| **Badges & Achievements** | Unlock "Week Warrior", "Topic Master", and more |
| **Learning Velocity Chart** | Visualize your progress over the last 7 days |

### 🌏 Accessibility
| Feature | Description |
|---------|-------------|
| **Bilingual UI** | Complete English/বাংলা toggle throughout the app |
| **Voice Input** | Speech-to-text support for asking questions |
| **Dark Mode** | Premium OLED-friendly dark theme |
| **Responsive Design** | Optimized for mobile, tablet, and desktop |

### 🔐 Authentication & Security
| Feature | Description |
|---------|-------------|
| **Email Authentication** | Secure sign-up and login via Supabase |
| **Password Recovery** | Forgot password with email reset link 🆕 |
| **Row Level Security** | Data isolation per user |
| **Admin Authorization** | Whitelisted admin emails for book uploads |

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
    GEMINI_API_KEY=your_gemini_key  # For OCR (optional)
    ```

4.  **Run Locally**
    ```bash
    npm start
    ```
    Visit `http://localhost:3000`

---

## 🗄️ Database Setup

Run the complete setup script in Supabase SQL Editor:

1. Open [`scripts/database_setup.sql`](scripts/database_setup.sql)
2. Copy the **entire file** contents
3. Paste and run in **Supabase Dashboard → SQL Editor**
4. Create storage buckets in **Storage** tab:
   - `books` (user uploads)
   - `official-books` (NCTB books)

### Tables Created
| Table | Description |
|-------|-------------|
| `profiles` | User profiles with education info |
| `learning_stats` | Daily progress tracking |
| `quiz_attempts` | Quiz history and scores |
| `chat_history` | AI tutor conversations |
| `library_books` | User uploaded books |
| `book_chapters` | Extracted chapters (OCR) |
| `book_content` | Full text for quiz generation |
| `official_resources` | Admin uploaded NCTB books |
| `notifications` | User notifications |

> ⚠️ **Supabase Free Tier Limitation**: Maximum file upload size is **50 MB**.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | Vanilla JS, Tailwind CSS, HTML5 |
| **Backend** | Supabase (Auth, DB, Storage, RLS) |
| **Orchestration** | Vercel Serverless Functions |
| **AI (Logic)** | Llama 4 Scout (via Groq) |
| **AI (Vision)** | FLUX.1-dev (via Hugging Face) |
| **AI (OCR)** | Gemini 2.0 Flash (via Google AI) |

---

## 📂 Project Structure

```
koushole-app/
├── api/                         # Vercel serverless functions
│   ├── chat.js                  # AI chat endpoint
│   ├── generate.js              # Quiz generation
│   ├── generate-image.js        # Image generation
│   └── process-book.js          # PDF OCR & chapter extraction
├── public/
│   ├── index.html               # Main app
│   ├── admin.html               # Admin panel
│   ├── reset-password.html      # Password recovery
│   ├── js/
│   │   ├── app.js               # Main app logic
│   │   ├── admin.js             # Admin panel logic
│   │   ├── quiz.js              # Quiz functionality
│   │   ├── subjects.js          # NCTB curriculum data
│   │   ├── fetchOfficialResources.js
│   │   └── supabase-config.js
│   └── css/
├── scripts/
│   └── database_setup.sql       # Complete DB setup
└── vercel.json                  # Deployment config
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
