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

Koushole employs a sophisticated **Agentic AI Architecture** with a cost-effective, open-source processing pipeline.

> 💡 **Customizable**: All AI components can be swapped with your preferred tools. The architecture is modular!

### Core AI Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Chat Tutor** | Llama 4 Scout (Groq) | Socratic teaching method |
| **Quiz Generator** | Llama 4 Scout (Groq) | Infinite practice questions |
| **Image Generator** | FLUX.1-dev (HuggingFace) | Scientific diagrams on-demand |
| **Batch OCR** | Surya OCR (Google Colab) | High-accuracy Bangla extraction for official books |
| **Instant OCR** | Gemini 2.0 Flash | Real-time OCR for user library uploads |
| **Embeddings** | Voyage AI (voyage-multilingual-2) | Semantic search for RAG (1024-dim) |
| **Database** | Supabase + pgvector | Vector storage & auth |

> 🚀 **Coming Soon**: Our own dedicated processing API for automatic book processing!

### RAG Pipeline (Retrieval-Augmented Generation)

```
📚 Official Books → 🔮 Surya OCR (Colab - Manual) → 📦 Chunking → 🔢 Voyage AI → 💾 Supabase
📖 User Library → ⚡ Gemini OCR (Instant) → 📦 Chunking → 🔢 Voyage AI → 💾 Supabase
                                                                              ↓
🧑‍🎓 Student Query → 🔍 Vector Search → 📖 Relevant Context → 🤖 Llama 4 → 💬 AI Response
```

---

## ✨ Key Features

### 📚 Library & Content
| Feature | Description |
|---------|-------------|
| **Official NCTB 2026 Books** | Admin-uploaded textbooks aligned with the latest NCTB curriculum |
| **RAG-Powered Chat** | Ask questions about any book with AI-powered context retrieval |
| **Custom Library** | Upload PDFs for personalized quizzes and chat |
| **Complete Curriculum** | Class 6-8, SSC (Class 9-10) & HSC (Class 11-12) |
| **Group-Based Filtering** | Science, Business Studies, Humanities |

### 📝 Smart Assessment
| Feature | Description |
|---------|-------------|
| **Chapter-Based Quizzes** | Select specific chapters for targeted practice |
| **Custom Question Count** | Choose 5-50 questions per quiz |
| **Question Variety** | MCQ, Matching, Ordering, Fill-in-Blank |
| **Adaptive Difficulty** | AI adjusts based on performance |

### 🎮 Gamification
| Feature | Description |
|---------|-------------|
| **12 Achievement Badges** | 🎯💯🔥⚔️👑🏆📚🧠⭐💎💰🌟 |
| **XP System** | Earn points for correct answers |
| **Daily Streaks** | Build consistent study habits |
| **Learning Velocity Chart** | Visualize progress over 7 days |

### 🌏 Accessibility
| Feature | Description |
|---------|-------------|
| **Bilingual UI** | Complete English/বাংলা toggle |
| **Voice Input** | Speech-to-text support |
| **Dark Mode** | Premium OLED-friendly theme |
| **Mobile-First** | Responsive design |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- [Supabase Account](https://supabase.com) (Mumbai region for Bangladesh)
- [Groq API Key](https://console.groq.com) (free)
- [Voyage AI API Key](https://dash.voyageai.com) (50M free tokens/month)
- [HuggingFace API Key](https://huggingface.co/settings/tokens) (for FLUX images)
- [Google AI API Key](https://aistudio.google.com) (optional, for Gemini OCR)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/KawserMahamudJunyed/MXB2026-Dhaka-Tensorithm-Koushole.git
   cd MXB2026-Dhaka-Tensorithm-Koushole
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Backend Environment (.env file)**
   Create a `.env` file in root:
   ```env
   # Required
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_KEY=your_service_key
   GROQ_API_KEY=your_groq_key
   VOYAGE_API_KEY=your_voyage_key
   
   # Optional
   HF_API_KEY=your_huggingface_key        # For FLUX image generation
   GEMINI_API_KEY=your_gemini_key         # For Gemini OCR (legacy)
   ```

4. **Frontend Configuration**
   Edit `public/js/supabase-config.js`:
   ```javascript
   const SUPABASE_URL = 'https://your-project.supabase.co';  // ← Update this
   const SUPABASE_ANON_KEY = 'your_anon_key';                // ← Update this
   ```
   > ⚠️ **Note**: Frontend runs in browser and cannot access .env files

5. **Run Locally**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`

---

## 🗄️ Database Setup

### One-Command Setup

1. Create a new Supabase project (Mumbai region for Bangladesh)
2. Open **SQL Editor** in Supabase Dashboard
3. Copy entire contents of [`scripts/complete_database_setup.sql`](scripts/complete_database_setup.sql)
4. Paste and click **Run**

### Create Storage Buckets

Go to **Storage** → **New Bucket**:
- `books` (public) - User uploads
- `official-books` (public) - NCTB textbooks

### Tables Created
| Table | Description |
|-------|-------------|
| `profiles` | User profiles with education info |
| `learning_stats` | Daily progress tracking |
| `quiz_attempts` | Quiz history and scores |
| `chat_history` | AI tutor conversations |
| `library_books` | User uploaded books |
| `book_chunks` | RAG chunks with 1024-dim embeddings |
| `official_resources` | Admin uploaded NCTB books |
| `badge_definitions` | 12 achievement badges |
| `user_badges` | Earned badges per user |
| `topic_mastery` | Subject mastery tracking |

---

## 📚 Processing Books (RAG Setup)

Books need to be processed for the AI chat to work. We use **Google Colab** (free GPU) for efficient processing.

### Quick Start

1. Upload `notebooks/koushole_rag_processor.ipynb` to [Google Colab](https://colab.research.google.com)
2. Go to **Runtime → Change runtime type → T4 GPU**
3. Run all cells in order
4. Enter your API keys when prompted

### Processing Pipeline
```
1. Download PDF from Supabase Storage
2. Convert to images (150 DPI)
3. Surya OCR (Bangla + English)
4. Chunk text (2000 chars, 200 overlap)
5. Generate embeddings (Voyage AI)
6. Store in book_chunks table
```

### Processing Time
| Book Size | Pages | Time (T4 GPU) |
|-----------|-------|---------------|
| Small | 50-100 | ~5 minutes |
| Medium | 100-200 | ~10 minutes |
| Large | 200-400 | ~20 minutes |

---

## 🛠️ Tech Stack

| Component | Technology | Free Tier |
|-----------|------------|----------|
| **Frontend** | Vanilla JS, Tailwind CSS | ✅ |
| **Backend** | Supabase (Auth, DB, Storage) | 500MB DB, 5GB egress |
| **Deployment** | Vercel Serverless Functions | 100GB bandwidth |
| **LLM** | Llama 4 Scout (Groq) | 30 req/min |
| **Embeddings** | Voyage AI (voyage-multilingual-2) | 50M tokens/month |
| **Image Gen** | FLUX.1-dev (HuggingFace) | Limited |
| **OCR** | Surya OCR (Google Colab T4) | Free GPU |
| **Vector DB** | pgvector (Supabase) | Included |

---

## 📂 Project Structure

```
koushole-app/
├── api/                        # Vercel serverless functions
│   ├── chat.js                 # AI chat endpoint
│   ├── generate.js             # Quiz generation
│   └── rag-chat.js             # RAG-powered chat with book context
├── notebooks/
│   └── koushole_rag_processor.ipynb  # Colab notebook for book processing
├── public/
│   ├── index.html              # Main app
│   ├── admin.html              # Admin panel
│   └── js/
│       ├── app.js              # Main app logic
│       ├── quiz.js             # Quiz functionality
│       └── subjects.js         # NCTB curriculum data
├── scripts/
│   └── complete_database_setup.sql  # Full DB setup (all-in-one)
└── vercel.json                 # Deployment config
```

---

## 🔐 Admin Panel

Upload official NCTB resources at `/admin.html`.

### Authorized Admins
Edit `public/js/admin.js`:
```javascript
const ALLOWED_ADMINS = [
    'admin@example.com',
    'your-email@example.com'
];
```

---

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 🙏 Acknowledgments

- **NCTB Bangladesh** for curriculum alignment
- **Groq** for fast LLM inference
- **Voyage AI** for multilingual embeddings
- **Supabase** for backend infrastructure
- **Google Colab** for free GPU access
- **HuggingFace** for FLUX image models
- **Black Forest Labs** for FLUX.1-dev

---

### 🚀 *Powered by Team Tensorithm*
**MillionX Bangladesh National AI Build-a-thon 2026**

*Building the future of education, one student at a time.* 🇧🇩
