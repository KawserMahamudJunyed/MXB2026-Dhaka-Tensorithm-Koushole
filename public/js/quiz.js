// ============================================================
// 🚨 IMMEDIATE GLOBAL EXPORTS - Define BEFORE anything else
// These stubs ensure functions exist even if script partially fails
// ============================================================
window.openQuizConfig = window.openQuizConfig || function () {
    console.log('⏳ openQuizConfig stub called - full script still loading...');
    const modal = document.getElementById('quiz-setup-modal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        alert('Quiz is loading, please wait a moment and try again.');
    }
};

window.closeQuizConfig = window.closeQuizConfig || function () {
    const modal = document.getElementById('quiz-setup-modal');
    if (modal) modal.classList.add('hidden');
};

window.startCustomQuiz = window.startCustomQuiz || function () {
    console.log('⏳ startCustomQuiz stub called - full script still loading...');
    alert('Quiz is still loading. Please wait a moment.');
};

// --- QUIZ STATE ---
let currentQuizQuestions = [];
let currentQuestionIndex = 0;
let selectedDifficulty = 'Medium';
let currentQuizContext = 'General'; // 'General' or 'Book'
let currentBookName = '';
let currentBookId = null;           // UUID of the book for RAG queries
let currentBookSourceType = 'library'; // 'library' or 'official'
let currentQuizScore = 0;
let selectedQuestionCount = 10; // Default question count
let recentQuestions = []; // Track recent questions to avoid repetition

let matchState = {
    selectedItem: null, // { side: 'left'|'right', index: number, elementId: string }
    pairedIndices: [],  // Array of {left: idx, right: idx}
    colorIndex: 0
};

let orderedItems = [];

// Note: matchColors is defined in data.js (loaded before this file)


// --- QUESTION COUNT HANDLER ---
function handleQuestionCountChange() {
    const dropdown = document.getElementById('config-question-count');
    const customInput = document.getElementById('config-custom-count');

    if (dropdown.value === 'custom') {
        customInput.classList.remove('hidden');
        customInput.focus();
    } else {
        customInput.classList.add('hidden');
        selectedQuestionCount = parseInt(dropdown.value);
    }
}

function getSelectedQuestionCount() {
    const dropdown = document.getElementById('config-question-count');
    const customInput = document.getElementById('config-custom-count');

    if (dropdown.value === 'custom' && customInput.value) {
        const count = parseInt(customInput.value);
        return Math.min(Math.max(count, 1), 50); // Clamp between 1-50
    }
    return parseInt(dropdown.value) || 10;
}

// --- SAVE QUIZ RESULTS TO SUPABASE ---
async function saveQuizResultsToDatabase(earnedXP, accuracyPercent) {
    if (!window.supabaseClient) {
        console.warn("Supabase client not available, skipping database save");
        return;
    }

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            console.warn("No user logged in, skipping database save");
            return;
        }

        const subject = document.getElementById('config-subject')?.value || 'General';
        const topic = document.getElementById('config-topic')?.value || 'All';

        // 1. Save to quiz_attempts table (for chart history)
        const { error: attemptError } = await window.supabaseClient
            .from('quiz_attempts')
            .insert({
                user_id: user.id,
                subject: subject,
                topic: topic,
                difficulty: selectedDifficulty || 'Medium',
                score_percentage: accuracyPercent,
                correct_answers: currentQuizScore,
                total_questions: currentQuizQuestions.length,
                xp_earned: earnedXP
            });

        if (attemptError) {
            console.error("Error saving quiz attempt:", attemptError);
        } else {
            console.log("✅ Quiz attempt saved!");
        }

        // 2. Update learning_stats with correct field names
        const { data: existingStats, error: fetchError } = await window.supabaseClient
            .from('learning_stats')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error("Error fetching stats:", fetchError);
        }

        const newTotalXP = (existingStats?.total_xp || 0) + earnedXP;
        const newQuizCount = (existingStats?.total_quizzes_completed || 0) + 1;
        const newQuestionsAnswered = (existingStats?.total_questions_answered || 0) + currentQuizQuestions.length;
        const newCorrectAnswers = (existingStats?.total_correct_answers || 0) + currentQuizScore;
        const newAccuracy = Math.round((newCorrectAnswers / newQuestionsAnswered) * 100);

        // Check streak
        const today = new Date().toISOString().split('T')[0];
        const lastQuizDate = existingStats?.last_quiz_date;
        let newStreak = existingStats?.day_streak || 0;
        let longestStreak = existingStats?.longest_streak || 0;

        if (lastQuizDate) {
            const lastDate = new Date(lastQuizDate);
            const todayDate = new Date(today);
            const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                newStreak++;
            } else if (diffDays > 1) {
                newStreak = 1;
            }
            // Same day = no change
        } else {
            newStreak = 1;
        }

        if (newStreak > longestStreak) {
            longestStreak = newStreak;
        }

        // 3. Upsert learning_stats
        const { error: statsError } = await window.supabaseClient
            .from('learning_stats')
            .upsert({
                user_id: user.id,
                total_xp: newTotalXP,
                accuracy_percentage: newAccuracy,
                total_quizzes_completed: newQuizCount,
                total_questions_answered: newQuestionsAnswered,
                total_correct_answers: newCorrectAnswers,
                day_streak: newStreak,
                longest_streak: longestStreak,
                last_quiz_date: today
            }, { onConflict: 'user_id' });

        if (statsError) {
            console.error("Error updating stats:", statsError);
        } else {
            console.log("✅ Learning stats updated!");
            // Update local userMemory to match
            window.userMemory.total_xp = newTotalXP;
            window.userMemory.accuracy_percentage = newAccuracy;
            window.userMemory.day_streak = newStreak;
        }

        // 4. Check and award badges
        await checkAndAwardBadges(user.id, newQuizCount, newStreak, accuracyPercent, newTotalXP);

    } catch (err) {
        console.error("Database save error:", err);
    }
}

// --- BADGE SYSTEM ---
async function checkAndAwardBadges(userId, quizCount, streak, lastScore, totalXP = 0) {
    if (!window.supabaseClient) return;

    try {
        // Fetch current badges
        const { data: stats } = await window.supabaseClient
            .from('learning_stats')
            .select('badges')
            .eq('user_id', userId)
            .single();

        const currentBadges = stats?.badges || [];
        const newBadges = [...currentBadges];
        let badgeAwarded = false;

        // --- Quiz Count Badges ---
        if (quizCount >= 1 && !currentBadges.includes('first_quiz')) {
            newBadges.push('first_quiz');
            badgeAwarded = true;
            showBadgeNotification('🎯', 'First Step!');
            if (typeof createNotification === 'function') createNotification('badge', 'Badge Unlocked: First Step!', 'Congratulations! You completed your first quiz.');
        }

        if (quizCount >= 10 && !currentBadges.includes('quiz_10')) {
            newBadges.push('quiz_10');
            badgeAwarded = true;
            showBadgeNotification('🔟', '10 Quizzes!');
            if (typeof createNotification === 'function') createNotification('badge', 'Badge Unlocked: 10 Quizzes', 'You completed 10 quizzes!');
        }

        if (quizCount >= 50 && !currentBadges.includes('quiz_50')) {
            newBadges.push('quiz_50');
            badgeAwarded = true;
            showBadgeNotification('🏆', 'Quiz Expert!');
            if (typeof createNotification === 'function') createNotification('badge', 'Badge Unlocked: Quiz Expert', 'You completed 50 quizzes! Amazing!');
        }

        if (quizCount >= 100 && !currentBadges.includes('quiz_100')) {
            newBadges.push('quiz_100');
            badgeAwarded = true;
            showBadgeNotification('👑', 'Quiz Legend!');
            if (typeof createNotification === 'function') createNotification('badge', 'Badge Unlocked: Quiz Legend', 'You completed 100 quizzes! Legendary!');
        }

        // --- Streak Badges ---
        if (streak >= 3 && !currentBadges.includes('streak_3')) {
            newBadges.push('streak_3');
            badgeAwarded = true;
            showBadgeNotification('🔥', '3 Day Streak!');
            if (typeof createNotification === 'function') createNotification('badge', 'Badge Unlocked: 3 Day Streak', 'You are on fire! 3 days in a row.');
        }

        if (streak >= 7 && !currentBadges.includes('streak_7')) {
            newBadges.push('streak_7');
            badgeAwarded = true;
            showBadgeNotification('⚔️', 'Week Warrior!');
            if (typeof createNotification === 'function') createNotification('badge', 'Badge Unlocked: Week Warrior', 'One whole week of consistency!');
        }

        if (streak >= 30 && !currentBadges.includes('streak_30')) {
            newBadges.push('streak_30');
            badgeAwarded = true;
            showBadgeNotification('🏅', 'Monthly Master!');
            if (typeof createNotification === 'function') createNotification('badge', 'Badge Unlocked: Monthly Master', '30 days in a row! Incredible dedication!');
        }

        // --- Perfect Score Badge ---
        if (lastScore === 100 && !currentBadges.includes('perfect_quiz')) {
            newBadges.push('perfect_quiz');
            badgeAwarded = true;
            showBadgeNotification('💯', 'Perfect Score!');
            if (typeof createNotification === 'function') createNotification('badge', 'Badge Unlocked: Perfect Score', 'You got 100% on a quiz! Amazing!');
        }

        // --- XP Badges ---
        if (totalXP >= 500 && !currentBadges.includes('xp_500')) {
            newBadges.push('xp_500');
            badgeAwarded = true;
            showBadgeNotification('⚡', 'XP Hunter!');
            if (typeof createNotification === 'function') createNotification('badge', 'Badge Unlocked: XP Hunter', 'You earned 500 XP!');
        }

        if (totalXP >= 2000 && !currentBadges.includes('xp_2000')) {
            newBadges.push('xp_2000');
            badgeAwarded = true;
            showBadgeNotification('💎', 'XP Master!');
            if (typeof createNotification === 'function') createNotification('badge', 'Badge Unlocked: XP Master', 'You earned 2000 XP!');
        }

        if (totalXP >= 5000 && !currentBadges.includes('xp_5000')) {
            newBadges.push('xp_5000');
            badgeAwarded = true;
            showBadgeNotification('🌟', 'XP Legend!');
            if (typeof createNotification === 'function') createNotification('badge', 'Badge Unlocked: XP Legend', 'You earned 5000 XP! Legendary!');
        }

        // Save new badges
        if (badgeAwarded) {
            await window.supabaseClient
                .from('learning_stats')
                .update({ badges: newBadges })
                .eq('user_id', userId);

            window.userMemory.badges = newBadges;
            console.log("✅ Badges updated:", newBadges);
        }

    } catch (err) {
        console.error("Badge check error:", err);
    }
}

function showBadgeNotification(icon, title) {
    // Create toast notification for badge
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-amber text-black px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-3 animate-bounce';
    toast.innerHTML = `<span class="text-2xl">${icon}</span><span class="font-bold">Badge Unlocked: ${title}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
}

// --- QUIZ CONFIGURATION ---

function updateChapters() {
    const subject = document.getElementById('config-subject').value;
    const topicSelect = document.getElementById('config-topic');
    topicSelect.innerHTML = '';

    // Use window.getChapters from subjects.js instead of undefined subjectChapters
    const userGroup = localStorage.getItem('userGroup') || 'Science';
    const userClass = localStorage.getItem('userClass') || '9';

    if (window.getChapters) {
        const chapters = window.getChapters(subject, userGroup, userClass);
        topicSelect.innerHTML = '<option value="all">All Chapters</option>';
        if (chapters && chapters.length > 0) {
            chapters.forEach(ch => {
                const opt = document.createElement('option');
                opt.value = ch.id;
                opt.innerText = (typeof currentLang !== 'undefined' && currentLang === 'bn') ? ch.bn : ch.en;
                topicSelect.appendChild(opt);
            });
        }
    } else {
        topicSelect.innerHTML = '<option value="General">General Review</option>';
    }
}

window.openQuizConfig = async function (bookName = null, presetSubject = null, presetTopic = null, bookId = null, sourceType = 'library') {
    console.log('🎯 openQuizConfig called:', { bookName, presetSubject, presetTopic, bookId, sourceType });

    // Check if Supabase is ready
    if (!window.supabaseClient) {
        console.error('❌ Supabase client not initialized!');
        alert('System not ready. Please refresh the page.');
        return;
    }

    try {
        currentQuizContext = bookName ? 'Book' : 'General';
        currentBookName = bookName || '';
        currentBookId = bookId;
        currentBookSourceType = sourceType;

        const modal = document.getElementById('quiz-setup-modal');
        const modalTitle = document.getElementById('modal-book-title');
        const subjectSelect = document.getElementById('config-subject');
        const topicSelect = document.getElementById('config-topic');

        if (!modal || !subjectSelect || !topicSelect) {
            console.error('❌ Quiz modal elements not found!');
            alert('Quiz setup error. Please refresh the page.');
            return;
        }

        // Function to populate chapters for selected subject (defined inside for scope access)
        async function populateChapters(subjectValue) {
            const userClass = localStorage.getItem('userClass') || '9';
            const userGroup = localStorage.getItem('userGroup') || 'Science';

            topicSelect.innerHTML = `<option value="all">${typeof currentLang !== 'undefined' && currentLang === 'bn' ? 'সব অধ্যায়' : 'All Chapters'}</option>`;

            // CASE 1: Library Book
            if (subjectValue.startsWith('library:')) {
                const bookIdValue = subjectValue.replace('library:', '');
                try {
                    const { data: chapters } = await window.supabaseClient
                        .from('book_chapters')
                        .select('id, chapter_number, title')
                        .eq('library_book_id', bookIdValue)
                        .order('chapter_number');

                    if (chapters && chapters.length > 0) {
                        chapters.forEach(chap => {
                            const opt = document.createElement('option');
                            opt.value = chap.id;
                            opt.innerText = chap.title || `Chapter ${chap.chapter_number}`;
                            topicSelect.appendChild(opt);
                        });
                    } else {
                        topicSelect.innerHTML = `<option value="all">${typeof currentLang !== 'undefined' && currentLang === 'bn' ? 'সম্পূর্ণ বই' : 'Entire Book'}</option>`;
                    }
                } catch (e) {
                    console.warn('Could not fetch book chapters:', e);
                }
            }
            // CASE 2: Official Book
            else if (subjectValue.startsWith('official:')) {
                const bookIdValue = subjectValue.replace('official:', '');
                try {
                    const { data: chapters } = await window.supabaseClient
                        .from('book_chapters')
                        .select('id, chapter_number, title')
                        .eq('resource_id', bookIdValue)
                        .order('chapter_number');

                    if (chapters && chapters.length > 0) {
                        chapters.forEach(chap => {
                            const opt = document.createElement('option');
                            opt.value = chap.id;
                            opt.innerText = chap.title || `Chapter ${chap.chapter_number}`;
                            topicSelect.appendChild(opt);
                        });
                    }
                } catch (e) {
                    console.warn('Could not fetch official chapters:', e);
                }
            }
            // CASE 3: General Subject
            else {
                let dbChaptersFound = false;
                try {
                    const { data: resources } = await window.supabaseClient
                        .from('official_resources')
                        .select('id, chapters_extracted')
                        .eq('subject', subjectValue)
                        .eq('class', userClass)
                        .limit(1);

                    if (resources && resources.length > 0 && resources[0].chapters_extracted > 0) {
                        const { data: chapters } = await window.supabaseClient
                            .from('book_chapters')
                            .select('id, chapter_number, title')
                            .eq('resource_id', resources[0].id)
                            .order('chapter_number');

                        if (chapters && chapters.length > 0) {
                            dbChaptersFound = true;
                            chapters.forEach(chap => {
                                const opt = document.createElement('option');
                                opt.value = chap.id;
                                opt.innerText = chap.title || `Chapter ${chap.chapter_number}`;
                                topicSelect.appendChild(opt);
                            });
                        }
                    }
                } catch (e) {
                    console.warn('Could not fetch official book chapters:', e);
                }

                // Fallback to predefined chapters from subjects.js
                if (!dbChaptersFound && window.getChapters) {
                    const chapters = window.getChapters(subjectValue, userGroup, userClass);
                    if (chapters && chapters.length > 0) {
                        chapters.forEach(chap => {
                            const opt = document.createElement('option');
                            opt.value = chap.id;
                            opt.innerText = typeof currentLang !== 'undefined' && currentLang === 'bn' ? chap.bn : chap.en;
                            topicSelect.appendChild(opt);
                        });
                    }
                }
            }
        }

        // Setup mode-specific UI
        if (bookName) {
            modalTitle.innerText = `Source: ${bookName}`;
            const prefix = sourceType === 'library' ? 'library:' : 'official:';
            const val = bookId ? `${prefix}${bookId}` : 'Book';
            subjectSelect.innerHTML = `<option value="${val}">${bookName}</option>`;
            subjectSelect.disabled = true;
        } else {
            modalTitle.innerText = typeof currentLang !== 'undefined' && currentLang === 'bn' ? 'কাস্টম সেটআপ' : 'Custom Setup';
            subjectSelect.disabled = false;

            const userGroup = localStorage.getItem('userGroup') || 'Science';
            const userClass = localStorage.getItem('userClass') || '9';

            if (window.getSubjects) {
                const subjectNames = window.getSubjects(userGroup, userClass);
                console.log('📚 Subjects loaded:', subjectNames);
                subjectSelect.innerHTML = subjectNames.map(subjectName => {
                    // Get subject data for translation
                    const subjectData = window.getSubjectData ? window.getSubjectData(subjectName, userGroup, userClass) : null;
                    const displayName = (typeof currentLang !== 'undefined' && currentLang === 'bn' && subjectData?.bn)
                        ? subjectData.bn
                        : subjectName;
                    return `<option value="${subjectName}">${displayName}</option>`;
                }).join('');
            } else {
                subjectSelect.innerHTML = `
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="English">English</option>
                `;
            }
        }

        // Handle subject change
        subjectSelect.onchange = () => {
            populateChapters(subjectSelect.value);
        };

        // Set presets if provided
        if (presetSubject) {
            subjectSelect.value = presetSubject;
        }

        // Populate chapters for current selection
        await populateChapters(subjectSelect.value);

        if (presetTopic) {
            topicSelect.value = presetTopic;
        }

        // 🎯 CRITICAL: Show the modal!
        modal.classList.remove('hidden');
        console.log('✅ Quiz config modal opened successfully');

    } catch (error) {
        console.error('❌ openQuizConfig error:', error);
        alert('Failed to open quiz setup: ' + error.message);
    }
}

function closeQuizConfig() {
    document.getElementById('quiz-setup-modal').classList.add('hidden');
}

// --- QUIZ GENERATION & START ---

async function startCustomQuiz() {
    closeQuizConfig();

    ['dashboard', 'quiz', 'chat', 'profile', 'library'].forEach(v => {
        document.getElementById('view-' + v).classList.add('hidden');
        document.getElementById('nav-' + v).classList.remove('active', 'text-amber');
    });
    document.getElementById('view-quiz').classList.remove('hidden');
    document.getElementById('nav-quiz').classList.add('active', 'text-amber');

    document.getElementById('quiz-results').classList.add('hidden');
    document.getElementById('quiz-content').classList.add('hidden');
    document.getElementById('quiz-empty-state').classList.add('hidden');
    document.getElementById('quiz-loading').classList.remove('hidden');

    const subject = document.getElementById('config-subject').value;
    const topic = document.getElementById('config-topic').value || "General";
    const questionCount = getSelectedQuestionCount();

    const langInstruction = window.currentLang === 'bn'
        ? "Output questions entirely in Bangla language, BUT use English digits (0-9) for all numbers. Do not use Bangla numerals."
        : "Output in English.";

    // Generate a random seed for variety
    const randomSeed = Math.floor(Math.random() * 10000);

    // Get student performance for personalization
    const streak = window.userMemory?.day_streak || 0;
    const accuracy = window.userMemory?.accuracy || 50;
    const totalQuizzes = window.userMemory?.total_quizzes || 0;

    let promptContext = "";
    let bookContext = "";
    let useHybridMode = false;

    // Check if we have book content for RAG-enhanced quiz generation
    if (window.currentQuizContext === 'Book' && window.currentBookId) {
        try {
            // Fetch relevant book chunks for context (60:40 hybrid mode)
            const { data: chunks, error } = await window.supabaseClient
                .from('book_chunks')
                .select('chunk_text')
                .eq(window.currentBookSourceType === 'library' ? 'library_book_id' : 'resource_id', window.currentBookId)
                .limit(5);

            if (!error && chunks && chunks.length > 0) {
                useHybridMode = true;
                bookContext = chunks.map(c => c.chunk_text).join('\n\n---\n\n');
                const bookQuestions = Math.ceil(questionCount * 0.6); // 60% from book
                const aiQuestions = questionCount - bookQuestions; // 40% AI-generated

                promptContext = `**HYBRID QUIZ MODE (60:40 Split)**

📚 BOOK CONTENT (Generate ${bookQuestions} questions from this):
${bookContext.substring(0, 6000)}

🤖 AI-GENERATED (Generate ${aiQuestions} additional questions):
- Topic: "${topic}"
- Subject: ${subject}
- These should cover related concepts NOT in the book excerpts above
- Include more advanced or broader conceptual questions

TOTAL: Generate exactly ${questionCount} unique questions.
The first ${bookQuestions} MUST be directly from the book content above.
The remaining ${aiQuestions} should be AI-generated based on the topic.`;
            } else {
                // No book chunks, fall back to topic-only mode
                promptContext = `Generate ${questionCount} UNIQUE quiz questions based on book "${window.currentBookName}". Focus on "${topic}".`;
            }
        } catch (ragError) {
            console.warn('RAG fetch failed, using topic-only mode:', ragError);
            promptContext = `Generate ${questionCount} UNIQUE quiz questions based on book "${window.currentBookName}". Focus on "${topic}".`;
        }
    } else {
        // Standard quiz generation (no books, uses NCTB chapters/topics)
        promptContext = `Generate ${questionCount} UNIQUE quiz questions.

**STRICT SUBJECT REQUIREMENT:**
- Subject: "${subject}" 
- Chapter/Topic: "${topic}"
- ALL ${questionCount} questions MUST be about "${subject}" ONLY
- Do NOT include questions from other subjects
- This is for Bangladeshi NCTB curriculum

For example:
- If subject is "Physics", ask about motion, energy, electricity, etc.
- If subject is "Bangla 1st Paper", ask about literature, poems, prose, etc.
- If subject is "Mathematics", ask about algebra, geometry, calculus, etc.

NEVER mix subjects. Every single question must be relevant to "${subject}".`;
    }

    // Add student observation for personalization
    promptContext += `\n\nSTUDENT PROFILE:
- Quiz Experience: ${totalQuizzes} quizzes taken
- Accuracy: ${accuracy}%
- Streak: ${streak} days
${accuracy < 60 ? '- Focus on EASIER questions with more hints' : ''}
${accuracy > 80 ? '- Include some CHALLENGING questions' : ''}`;

    if (window.userMemory?.weaknesses && window.userMemory.weaknesses.length > 0) {
        promptContext += `\n- Weak Areas: ${window.userMemory.weaknesses.join(', ')}. Include 2-3 questions targeting these.`;
    }

    promptContext += `\n\n**CRITICAL RULES:**
- Difficulty: ${selectedDifficulty}
- Random Seed: ${randomSeed} (use this to ensure variety)
- Each question MUST be different and unique
- ALL questions MUST be about "${subject}" - no exceptions!
- You can use your knowledge and training data to create accurate questions about this subject
- ${langInstruction}
${useHybridMode ? '- HYBRID MODE: 60% from book content, 40% from your knowledge about the topic.' : '- 100% AI MODE: Use your training knowledge to create accurate, curriculum-relevant questions.'}

**FORMATTING (Very Important):**
- CHEMISTRY: Use Unicode subscripts for formulas
  ✓ H₂O (water), CO₂ (carbon dioxide), H₂SO₄ (sulfuric acid), NaCl, CH₄
  ✗ H2O, CO2, H2SO4 (WRONG)
- MATH: Use Unicode superscripts for powers/exponents
  ✓ a², x³, r², πr², E=mc², (a+b)²
  ✗ a^2, x^3, a2 (WRONG)
- PHYSICS: Combine both as needed
  ✓ v² = u² + 2as, F = ma, PV = nRT
- Use these Unicode characters: ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ⁰ (superscript) and ₀ ₁ ₂ ₃ ₄ ₅ ₆ ₇ ₈ ₉ (subscript)
- Other symbols: π (pi), √ (sqrt), × (multiply), ÷ (divide), ° (degree), Δ (delta)

Mix these question types EVENLY:
1. Multiple Choice (mcq) - most common
2. Fill in the Gap (fill_gap) - provide 4 options including the answer
3. Matching Pairs (match) - provide 2 or 3 pairs
4. Order/Sentence Building (order) - provide a sentence or formula split into shuffled parts
5. Voice Answer (voice) - for definitions or short answers

Return ONLY a valid JSON array with ${questionCount} questions. Structure:
{
  "type": "mcq" | "fill_gap" | "match" | "order" | "voice",
  "question": "string",
  "topic": "string concept",
  "options": ["opt1", "opt2", "opt3", "opt4"], 
  "correctIndex": 0, 
  "pairs": {"left1":"right1", "left2":"right2"}, 
  "items": ["part1", "part2", "part3"], 
  "answer": "correct string", 
  "hint": "string",
  "explanation": "string"
}`;

    try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 sec timeout

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptContext }] }] }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.error) throw new Error(data.error);

        let text = data.candidates[0].content.parts[0].text;

        const jsonMatch = text.match(/\[\s*\{.*\}\s*\]/s);
        if (jsonMatch) {
            currentQuizQuestions = JSON.parse(jsonMatch[0]);
        } else {
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            if (text.startsWith('[')) {
                currentQuizQuestions = JSON.parse(text);
            } else {
                throw new Error("Invalid JSON format");
            }
        }

        currentQuestionIndex = 0;
        currentQuizScore = 0;
        document.getElementById('quiz-loading').classList.add('hidden');
        document.getElementById('quiz-content').classList.remove('hidden');

        // Show hybrid mode indicator
        const modeIndicator = useHybridMode ? ' 📚' : '';
        document.getElementById('quiz-topic-display').innerText = currentQuizContext === 'Book'
            ? `${currentBookName}${modeIndicator}`
            : `${subject} • ${topic}`;
        renderQuestion();

    } catch (error) {
        console.error("API Error:", error);

        // Show appropriate error message
        if (error.name === 'AbortError') {
            alert("Quiz generation timed out. Using offline questions instead.");
        } else {
            alert("AI generation failed. Loading offline backup.");
        }

        loadMockQuestions();

        currentQuestionIndex = 0;
        currentQuizScore = 0;
        document.getElementById('quiz-loading').classList.add('hidden');
        document.getElementById('quiz-content').classList.remove('hidden');
        document.getElementById('quiz-topic-display').innerText = `${subject} • ${topic}`;
        renderQuestion();
    }
}


function loadMockQuestions() {
    currentQuizQuestions = [
        {
            type: "mcq",
            question: "If a car accelerates from rest at 5 m/s² for 10 seconds, what is its final velocity?",
            topic: "Kinematics",
            options: ["25 m/s", "50 m/s", "100 m/s", "15 m/s"],
            correctIndex: 1,
            hint: "Recall: v = u + at",
            explanation: "Initial velocity (u)=0, a=5, t=10. v = 0 + 5*10 = 50 m/s."
        },
        {
            type: "fill_gap",
            question: "Newton's ___ law states that every action has an equal and opposite reaction.",
            topic: "Newton's Laws",
            options: ["First", "Second", "Third", "Fourth"],
            correctIndex: 2,
            hint: "Action-Reaction pair",
            explanation: "Newton's Third Law describes action-reaction pairs."
        },
        {
            type: "match",
            question: "Match the unit to the quantity:",
            topic: "Units",
            pairs: { "Force": "Newton", "Energy": "Joule", "Power": "Watt" },
            hint: "N is for Force",
            explanation: "Force is measured in Newtons, Energy in Joules."
        },
        {
            type: "order",
            question: "Arrange the formula for Force:",
            topic: "Dynamics",
            items: ["m", "F", "=", "a"],
            answer: "F = m a",
            hint: "Force equals mass times acceleration",
            explanation: "F = ma is the mathematical representation of Newton's 2nd Law."
        },
        {
            type: "voice",
            question: "What is the unit of Current?",
            topic: "Electricity",
            answer: "Ampere",
            hint: "Starts with A",
            explanation: "The SI unit of electric current is the ampere."
        }
    ];
}

// --- RENDERING ---

function renderQuestion() {
    if (currentQuestionIndex >= currentQuizQuestions.length) {
        document.getElementById('quiz-content').classList.add('hidden');
        const resultView = document.getElementById('quiz-results');
        resultView.classList.remove('hidden');

        const percentage = Math.round((currentQuizScore / currentQuizQuestions.length) * 100);
        document.getElementById('result-score').innerText = `${percentage}%`;

        // Update userMemory with Supabase-compatible fields
        const earnedXP = 50 + (currentQuizScore * 10);
        window.userMemory.total_xp = (window.userMemory.total_xp || 0) + earnedXP;

        // Recalculate accuracy (weighted average)
        const oldTotal = window.userMemory.accuracy_percentage || 0;
        window.userMemory.accuracy_percentage = Math.round((oldTotal + percentage) / 2);

        saveMemory();

        // Also save to Supabase for quizzes_completed tracking
        saveQuizResultsToDatabase(earnedXP, percentage);

        // Update UI to reflect new stats
        if (typeof updateUI === 'function') updateUI();
        if (typeof updateProfileUI === 'function') updateProfileUI();

        confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
        return;
    }

    const q = currentQuizQuestions[currentQuestionIndex];
    document.getElementById('quiz-question-text').innerText = q.question;
    document.getElementById('quiz-hint-text').innerText = q.hint;
    document.getElementById('explanation-text').innerText = q.explanation;
    document.getElementById('quiz-counter').innerText = `Question ${currentQuestionIndex + 1}/${currentQuizQuestions.length}`;

    const badges = { mcq: "MCQ", fill_gap: "Fill Gap", match: "Matching", order: "Ordering", voice: "Speaking" };
    document.getElementById('question-type-badge').innerText = badges[q.type] || "Quiz";

    // Safety check for voice type in case of translation issues from AI
    // Sometimes AI returns "text" instead of "voice"
    if (q.type === 'text') q.type = 'voice';

    document.getElementById('feedback-area').classList.add('hidden');

    // Reset question header display (in case previous was fill_gap)
    document.getElementById('quiz-question-text').style.display = '';
    const container = document.getElementById('input-container');
    container.innerHTML = '';

    if (q.type === 'mcq') {
        q.options.forEach((opt, idx) => {
            container.innerHTML += `
                <button onclick="checkAnswer('mcq', ${idx})" 
                class="quiz-option w-full text-left p-4 min-h-[52px] h-auto rounded-xl bg-surface border border-divider text-text-primary font-medium hover:border-amber transition-all active:scale-[0.98] hover:scale-[1.01] transition-transform">
                    ${String.fromCharCode(65 + idx)}. ${opt}
                </button>
            `;
        });
    }
    else if (q.type === 'fill_gap') {
        // Hide the main question header since we show formatted version below
        document.getElementById('quiz-question-text').style.display = 'none';

        const optionsHtml = q.options.map((opt, idx) =>
            `<button onclick="checkAnswer('fill_gap', ${idx})" class="quiz-option px-4 py-3 min-h-[48px] bg-surface border border-divider rounded-xl text-sm font-bold hover:border-amber transition-colors">${opt}</button>`
        ).join(' ');

        container.innerHTML = `
            <div class="p-4 bg-midnight rounded-xl border border-divider text-lg font-medium text-center mb-4 leading-loose">
                ${(q.question.match(/_{3,}|…|\.\.\.|\[gap\]/) ? q.question : q.question + ' _____')
                .replace(/_{3,}|…|\.\.\.|\[gap\]/g, '<span class="inline-block min-w-[60px] border-b-2 border-amber px-2 text-amber font-bold mx-1">?</span>')}
            </div>
            <div class="flex flex-wrap gap-2 justify-center">
                ${optionsHtml}
            </div>
        `;
    }
    else if (q.type === 'match') {
        matchState = { selectedItem: null, pairedIndices: [], colorIndex: 0 };

        const lefts = Object.keys(q.pairs);
        const rights = Object.values(q.pairs).sort(() => Math.random() - 0.5);

        container.setAttribute('data-rights', JSON.stringify(rights));

        let leftHtml = lefts.map((l, idx) => `
            <button id="left-${idx}" onclick="selectMatch('left', ${idx})" 
            class="match-item w-full p-3 bg-surface border border-divider rounded-lg text-sm font-bold mb-2 hover:border-sky text-left transition-all relative">
                ${l}
            </button>`).join('');

        let rightHtml = rights.map((r, idx) => `
            <button id="right-${idx}" onclick="selectMatch('right', ${idx})" 
            class="match-item w-full p-3 bg-surface border border-divider rounded-lg text-sm font-bold mb-2 hover:border-sky text-right transition-all relative">
                ${r}
            </button>`).join('');

        container.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div id="col-left">${leftHtml}</div>
                <div id="col-right">${rightHtml}</div>
            </div>
            <button onclick="checkAnswer('match')" class="w-full mt-2 bg-amber/10 border border-amber text-amber font-bold py-3 rounded-xl hover:bg-amber hover:text-black transition-colors">${t('checkMatches')}</button>
        `;
    }
    else if (q.type === 'order') {
        orderedItems = [];
        const itemsHtml = q.items.map((item, idx) =>
            `<button id="order-item-${idx}" onclick="addToOrder('${item.replace(/'/g, "\\'")}', ${idx})" 
            class="order-word px-4 py-3 bg-surface border border-divider rounded-xl font-bold text-lg hover:border-amber hover:scale-105 transition-all shadow-sm">${item}</button>`
        ).join(' ');

        container.innerHTML = `
            <div class="text-center mb-6">
                <p class="text-text-secondary text-xs uppercase tracking-widest mb-2 font-bold">Build the correct answer</p>
                <div id="order-drop-zone" class="w-full min-h-[80px] bg-midnight/50 border-2 border-dashed border-divider rounded-2xl flex flex-wrap items-center justify-center gap-2 p-4 transition-all hover:border-amber/30 group relative">
                    <span class="text-text-secondary text-sm opacity-50 absolute pointer-events-none group-hover:opacity-0 transition-opacity">Tap blocks below to arrange here</span>
                </div>
            </div>

            <div class="flex flex-wrap gap-3 justify-center mb-8">
                ${itemsHtml}
            </div>

            <div class="grid grid-cols-2 gap-4">
                <button onclick="resetOrder()" class="flex items-center justify-center gap-2 py-3 rounded-xl border border-divider text-text-secondary font-bold hover:bg-rose/10 hover:text-rose hover:border-rose transition-all">
                    <i class="fas fa-undo"></i> Reset
                </button>
                <button onclick="checkAnswer('order')" class="flex items-center justify-center gap-2 py-3 rounded-xl bg-amber text-black font-bold shadow-amber-glow hover:scale-[1.02] active:scale-[0.98] transition-all">
                    Submit <i class="fas fa-check"></i>
                </button>
            </div>
        `;
    }
    else if (q.type === 'voice' || q.type === 'text') {
        container.innerHTML = `
            <div class="flex flex-col items-center gap-4 py-4">
                <button id="quiz-mic-btn" onclick="toggleVoiceRecording('quiz-answer-display')" class="w-16 h-16 rounded-full bg-surface border-2 border-divider flex items-center justify-center text-text-secondary hover:text-amber hover:border-amber transition-all shadow-lg hover:scale-110">
                    <i class="fas fa-microphone text-2xl"></i>
                </button>
                <p id="quiz-answer-display" class="text-text-primary text-lg font-medium min-h-[1.5em] italic" data-key="micTap">${t('micTap')}</p>
                <button onclick="checkAnswer('text')" class="w-full bg-amber/10 border border-amber text-amber font-bold py-3 rounded-xl hover:bg-amber hover:text-black transition-colors">
                    ${t('voiceCheck')}
                </button>
            </div>
        `;
    }
    document.getElementById('quiz-progress').style.width = `${((currentQuestionIndex) / currentQuizQuestions.length) * 100}%`;

    // Trigger MathJax to render any LaTeX equations
    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise().catch((err) => console.warn('MathJax typeset error:', err));
    }
}


function selectMatch(side, idx) {
    const btnId = `${side}-${idx}`;
    const btn = document.getElementById(btnId);

    if (btn.classList.contains('match-paired')) return;

    if (!matchState.selectedItem) {
        matchState.selectedItem = { side, index: idx, elementId: btnId };
        btn.classList.add('match-selected');
        return;
    }

    if (matchState.selectedItem.elementId === btnId) {
        matchState.selectedItem = null;
        btn.classList.remove('match-selected');
        return;
    }

    if (matchState.selectedItem.side === side) {
        document.getElementById(matchState.selectedItem.elementId).classList.remove('match-selected');
        matchState.selectedItem = { side, index: idx, elementId: btnId };
        btn.classList.add('match-selected');
        return;
    }

    const firstItem = matchState.selectedItem;
    // const secondItem = { side, index: idx, elementId: btnId };

    // Use consistent dark background for both matched items
    const colorClass = matchColors[matchState.colorIndex % matchColors.length];

    // Use bg-midnight for consistent dark background on all matched pairs
    const firstBtn = document.getElementById(firstItem.elementId);
    firstBtn.className = `match-item w-full p-3 rounded-lg text-sm font-bold mb-2 text-${firstItem.side === 'left' ? 'left' : 'right'} transition-all relative match-paired bg-midnight border-2 ${colorClass}`;

    btn.className = `match-item w-full p-3 rounded-lg text-sm font-bold mb-2 text-${side === 'left' ? 'left' : 'right'} transition-all relative match-paired bg-midnight border-2 ${colorClass}`;

    const leftIdx = side === 'left' ? idx : firstItem.index;
    const rightIdx = side === 'right' ? idx : firstItem.index;

    matchState.pairedIndices.push({ left: leftIdx, right: rightIdx });

    matchState.colorIndex++;
    matchState.selectedItem = null;
}

function addToOrder(item, idx) {
    orderedItems.push(item);
    // Hide the picked word and mark it visually
    const btn = document.getElementById(`order-item-${idx}`);
    if (btn) {
        btn.classList.add('bg-amber', 'text-black', 'border-amber', 'opacity-50', 'pointer-events-none');
    }
    document.getElementById('order-drop-zone').innerHTML = orderedItems.map((i, index) =>
        `<span class="bg-amber/20 border border-amber px-3 py-1 rounded-lg text-amber font-medium">${i}</span>`
    ).join(' ');
}

function resetOrder() {
    orderedItems = [];
    document.getElementById('order-drop-zone').innerHTML = '';
}

function checkAnswer(type, selectedIdx = null) {
    const q = currentQuizQuestions[currentQuestionIndex];
    let isCorrect = false;

    if (type === 'mcq' || type === 'fill_gap') {
        const options = document.querySelectorAll('.quiz-option');
        options.forEach(opt => opt.disabled = true);
        if (selectedIdx === q.correctIndex) isCorrect = true;

        if (isCorrect) {
            options[selectedIdx].classList.add('bg-emerald/10', 'border-emerald', 'text-emerald');
            if (type === 'mcq') options[selectedIdx].innerHTML += ` <i class="fas fa-check-circle float-right mt-1"></i>`;
        } else {
            options[selectedIdx].classList.add('bg-rose/10', 'border-rose', 'text-rose', 'animate-shake');
            options[q.correctIndex].classList.add('bg-emerald/10', 'border-emerald', 'text-emerald');
        }

    } else if (type === 'match') {
        // Validate Pairs
        const rightsData = JSON.parse(document.getElementById('input-container').getAttribute('data-rights'));
        const leftKeys = Object.keys(q.pairs);

        let allCorrect = true;

        if (matchState.pairedIndices.length !== leftKeys.length) {
            allCorrect = false;
        } else {
            matchState.pairedIndices.forEach(pair => {
                const leftText = document.getElementById(`left-${pair.left}`).innerText.trim();
                const rightText = rightsData[pair.right];

                if (q.pairs[leftText] !== rightText) {
                    allCorrect = false;
                    document.getElementById(`left-${pair.left}`).classList.add('match-wrong');
                    document.getElementById(`right-${pair.right}`).classList.add('match-wrong');
                }
            });
        }

        if (allCorrect) isCorrect = true;
        else {
            leftKeys.forEach((key, lIdx) => {
                const correctRightText = q.pairs[key];
                const rIdx = rightsData.indexOf(correctRightText);

                if (rIdx !== -1) {
                    document.getElementById(`left-${lIdx}`).classList.add('match-solution');
                    document.getElementById(`right-${rIdx}`).classList.add('match-solution');
                }
            });
        }

    } else if (type === 'order') {
        // Check if order matches the correct answer
        const q = currentQuizQuestions[currentQuestionIndex];
        const userItems = orderedItems.map(item => item.toLowerCase().trim());

        // Handle both string answer and array correctOrder (legacy/fallback)
        let correctSentence = "";
        if (q.answer) {
            correctSentence = q.answer.trim();
        } else if (Array.isArray(q.correctOrder)) {
            correctSentence = q.correctOrder.join(' ').trim();
        }

        // Normalize for comparison
        const normalize = (str) => str.replace(/[,;:.!?=+]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
        const normalizedCorrect = normalize(correctSentence);
        const normalizedUser = normalize(orderedItems.join(' '));

        // Method 1: Direct comparison (after normalization)
        if (normalizedUser === normalizedCorrect) {
            isCorrect = true;
        }
        // Method 2: Check if user's items appear in correct sequence within the answer
        else {
            // Get the available items from the question (what user could select)
            const availableItems = (q.items || []).map(item => normalize(item));

            // Find the expected order of available items within the correct answer
            let expectedOrder = [];
            for (const item of availableItems) {
                const pos = normalizedCorrect.indexOf(item);
                if (pos !== -1) {
                    expectedOrder.push({ item, pos });
                }
            }
            expectedOrder.sort((a, b) => a.pos - b.pos);
            const expectedSequence = expectedOrder.map(e => e.item);

            // Check if user's selection matches the expected sequence
            const userNormalized = userItems.map(u => normalize(u));
            if (userNormalized.length === expectedSequence.length &&
                userNormalized.every((item, idx) => item === expectedSequence[idx])) {
                isCorrect = true;
            }
        }

        console.log('📋 Order Check:', {
            userItems: orderedItems,
            correct: correctSentence,
            normalizedUser,
            normalizedCorrect,
            isCorrect
        });

        // Show feedback on words
        const dropZone = document.getElementById('order-drop-zone');
        if (isCorrect) {
            dropZone.classList.remove('border-divider', 'bg-midnight/50');
            dropZone.classList.add('border-emerald', 'bg-emerald/10', 'text-emerald');
        } else {
            dropZone.classList.remove('border-divider', 'bg-midnight/50');
            dropZone.classList.add('border-rose', 'bg-rose/10', 'text-rose');

            // Show correct order
            dropZone.innerHTML += `
                <div class="w-full mt-3 pt-3 border-t border-rose/20 text-center">
                    <span class="text-xs text-text-secondary uppercase tracking-widest block mb-1">Correct Answer</span>
                    <span class="text-emerald font-bold text-lg">${correctSentence}</span>
                </div>`;
        }
    } else {
        // Voice/text answer - smarter fuzzy match
        const q = currentQuizQuestions[currentQuestionIndex];
        let userAns = document.getElementById('quiz-answer-display') ? document.getElementById('quiz-answer-display').innerText.toLowerCase().trim() : "";

        // Filter out system messages (multiple languages)
        if (userAns.includes("tap mic") || userAns.includes("কথা বলতে") || userAns.includes("listening") || userAns.includes("শুনছি")) {
            userAns = "";
        }

        // Prioritize 'answer' field (what AI generates) over 'correctAnswer'
        const correctAns = (q.answer || q.correctAnswer || "").toLowerCase().trim();

        // Handle empty user input
        if (userAns === "" || correctAns === "") {
            isCorrect = false;
        } else {
            // Tokenize and compare
            const clean = (str) => str.replace(/[^\w\s\u0980-\u09FF]/g, '').split(/\s+/).filter(w => w.length > 1);
            const uWords = clean(userAns);
            const cWords = clean(correctAns);

            // Check for specific numerical match (exact) or word overlap
            const intersection = uWords.filter(w => cWords.includes(w));
            const matchRatio = cWords.length > 0 ? intersection.length / cWords.length : 0;

            if (uWords.join(' ') === cWords.join(' ')) {
                isCorrect = true; // Exact match
            } else if (cWords.length === 1 && userAns.includes(correctAns)) {
                isCorrect = true; // Single word direct inclusion
            } else if (matchRatio >= 0.7) {
                isCorrect = true; // 70% overlap (stricter threshold)
            }
        }

        // Show clear feedback for voice/text answers
        const display = document.getElementById('quiz-answer-display');
        if (display) {
            const correctAnswerDisplay = q.answer || q.correctAnswer;
            if (isCorrect) {
                display.innerHTML += `<br><span class="text-emerald font-bold text-lg">✅ Correct!</span>`;
            } else {
                display.innerHTML += `<br><span class="text-rose font-bold text-lg">❌ Wrong</span>`;
                if (correctAnswerDisplay) {
                    display.innerHTML += `<br><span class="text-emerald text-sm">Correct Answer: ${correctAnswerDisplay}</span>`;
                }
            }
        }
    }

    if (isCorrect) {
        currentQuizScore++;
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 }, colors: ['#10B981'] });
        document.getElementById('quiz-progress').style.width = `${((currentQuestionIndex + 1) / currentQuizQuestions.length) * 100}%`;
        if (window.userMemory?.weaknesses?.includes(q.topic)) {
            window.userMemory.weaknesses = window.userMemory.weaknesses.filter(w => w !== q.topic);
            saveMemory();
        }
        setTimeout(() => document.getElementById('feedback-area').classList.remove('hidden'), 500);
    } else {
        if (q.topic && window.userMemory?.weaknesses && !window.userMemory.weaknesses.includes(q.topic)) {
            window.userMemory.weaknesses.push(q.topic);
            saveMemory();
        }

        // Khan Academy video option removed - API unreliable

        document.getElementById('feedback-area').classList.remove('hidden');
        if (navigator.vibrate) navigator.vibrate(200);
    }
}

function nextQuestion() {
    currentQuestionIndex++;
    renderQuestion();
}

// Expose functions to global scope for inline onclick handlers
// Note: openQuizConfig is already assigned to window at line 320
window.closeQuizConfig = closeQuizConfig;
window.startCustomQuiz = startCustomQuiz;
window.checkAnswer = checkAnswer;
window.nextQuestion = nextQuestion;
window.selectMatch = selectMatch;
window.addToOrder = addToOrder;
window.resetOrder = resetOrder;
window.handleQuestionCountChange = handleQuestionCountChange;
