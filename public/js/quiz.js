// --- QUIZ STATE ---
let currentQuizQuestions = [];
let currentQuestionIndex = 0;
let selectedDifficulty = 'Medium';
let currentQuizContext = 'General'; // 'General' or 'Book'
let currentBookName = '';
let currentQuizScore = 0;

let matchState = {
    selectedItem: null, // { side: 'left'|'right', index: number, elementId: string }
    pairedIndices: [],  // Array of {left: idx, right: idx}
    colorIndex: 0
};

let orderedItems = [];

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
                correct_count: currentQuizScore,
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
            userMemory.total_xp = newTotalXP;
            userMemory.accuracy_percentage = newAccuracy;
            userMemory.day_streak = newStreak;
        }

        // 4. Check and award badges
        await checkAndAwardBadges(user.id, newQuizCount, newStreak, accuracyPercent);

    } catch (err) {
        console.error("Database save error:", err);
    }
}

// --- BADGE SYSTEM ---
async function checkAndAwardBadges(userId, quizCount, streak, lastScore) {
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

        // Check conditions
        if (quizCount >= 1 && !currentBadges.includes('first_quiz')) {
            newBadges.push('first_quiz');
            badgeAwarded = true;
            showBadgeNotification('🎯', 'First Step!');
            if (typeof createNotification === 'function') createNotification('badge', 'Badge Unlocked: First Step!', 'Congratulations! You completed your first quiz.');
        }

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

        if (lastScore === 100 && !currentBadges.includes('perfect_quiz')) {
            newBadges.push('perfect_quiz');
            badgeAwarded = true;
            showBadgeNotification('💯', 'Perfect Score!');
            if (typeof createNotification === 'function') createNotification('badge', 'Badge Unlocked: Perfect Score', 'You got 100% on a quiz! Amazing!');
        }

        // Save new badges
        if (badgeAwarded) {
            await window.supabaseClient
                .from('learning_stats')
                .update({ badges: newBadges })
                .eq('user_id', userId);

            userMemory.badges = newBadges;
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

    if (subjectChapters[subject]) {
        subjectChapters[subject].forEach(chapter => {
            topicSelect.innerHTML += `<option value="${chapter}">${chapter}</option>`;
        });
    } else {
        topicSelect.innerHTML = `<option value="General">General Review</option>`;
    }
}

function openQuizConfig(bookName = null, presetSubject = null, presetTopic = null) {
    currentQuizContext = bookName ? 'Book' : 'General';
    currentBookName = bookName || '';

    const modalTitle = document.getElementById('modal-book-title');
    const subjectSelect = document.getElementById('config-subject');
    const topicSelect = document.getElementById('config-topic');

    if (bookName) {
        modalTitle.innerText = `Source: ${bookName}`;
        subjectSelect.innerHTML = `<option value="Book">${bookName}</option>`;
        subjectSelect.disabled = true;
        topicSelect.innerHTML = `<option value="All Chapters">All Chapters</option>`;
    } else {
        modalTitle.innerText = currentLang === 'bn' ? "কাস্টম সেটআপ" : "Custom Setup";

        // Use NCTB Curriculum Data
        // Map user group to curriculum key
        const groupMapping = {
            'science': 'science',
            'humanities': 'humanities',
            'business studies': 'business',
            'business': 'business'
        };
        const userGroup = (userProfile.group || 'Science').toLowerCase();
        const curriculumKey = groupMapping[userGroup] || 'science';

        let subjects = [];
        if (typeof nctbCurriculum !== 'undefined' && nctbCurriculum[curriculumKey]) {
            subjects = [...nctbCurriculum[curriculumKey], ...nctbCurriculum.common];
        } else if (typeof nctbCurriculum !== 'undefined') {
            subjects = [...nctbCurriculum.science, ...nctbCurriculum.common];
        } else {
            // Fallback if nctbCurriculum is not defined
            subjects = [
                { id: 'physics', nameEn: 'Physics', nameBn: 'পদার্থবিজ্ঞান', chapters: [] },
                { id: 'chemistry', nameEn: 'Chemistry', nameBn: 'রসায়ন', chapters: [] },
                { id: 'biology', nameEn: 'Biology', nameBn: 'জীববিজ্ঞান', chapters: [] },
                { id: 'math', nameEn: 'Mathematics', nameBn: 'গণিত', chapters: [] }
            ];
        }

        subjectSelect.innerHTML = '';
        subjects.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.id;
            opt.innerText = currentLang === 'bn' ? sub.nameBn : sub.nameEn;
            subjectSelect.appendChild(opt);
        });
        subjectSelect.disabled = false;

        // Populate chapters for first subject
        const firstSub = subjects[0];
        topicSelect.innerHTML = `<option value="all">${currentLang === 'bn' ? 'সব অধ্যায়' : 'All Chapters'}</option>`;
        if (firstSub && firstSub.chapters) {
            firstSub.chapters.forEach(chap => {
                const opt = document.createElement('option');
                opt.value = chap.id;
                opt.innerText = currentLang === 'bn' ? chap.bn : chap.en;
                topicSelect.appendChild(opt);
            });
        }

        // Handle subject change for chapters
        subjectSelect.onchange = () => {
            const selId = subjectSelect.value;
            const subData = subjects.find(s => s.id === selId);
            topicSelect.innerHTML = `<option value="all">${currentLang === 'bn' ? 'সব অধ্যায়' : 'All Chapters'}</option>`;
            if (subData && subData.chapters) {
                subData.chapters.forEach(chap => {
                    const opt = document.createElement('option');
                    opt.value = chap.id;
                    opt.innerText = currentLang === 'bn' ? chap.bn : chap.en;
                    topicSelect.appendChild(opt);
                });
            }
        };

        if (presetSubject) {
            subjectSelect.value = presetSubject;
            subjectSelect.dispatchEvent(new Event('change'));
        }
        if (presetTopic) topicSelect.value = presetTopic;
    }

    document.getElementById('quiz-setup-modal').classList.remove('hidden');
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

    const langInstruction = currentLang === 'bn'
        ? "Output questions entirely in Bangla language, BUT use English digits (0-9) for all numbers. Do not use Bangla numerals."
        : "Output in English.";

    let promptContext = "";
    if (currentQuizContext === 'Book') {
        promptContext = `Generate 5 quiz questions based on book "${currentBookName}". Focus on "${topic}".`;
    } else {
        promptContext = `Generate 5 quiz questions for Subject: ${subject}, Topic: "${topic}".`;
    }

    if (userMemory.weaknesses.length > 0) {
        promptContext += ` Student weaknesses: ${userMemory.weaknesses.join(', ')}. Include 1 question targeting these.`;
    }

    promptContext += ` Difficulty: ${selectedDifficulty}. ${langInstruction}
    Mix these types: 
    1. Multiple Choice (mcq)
    2. Fill in the Gap (fill_gap) - provide 4 options including the answer.
    3. Matching Pairs (match) - provide 2 or 3 pairs.
    4. Order/Sentence Building (order) - provide a sentence or formula split into shuffled parts.
    5. Voice Answer (voice)
    
    Return ONLY a valid JSON array. Structure:
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
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptContext }] }] })
        });

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
        document.getElementById('quiz-topic-display').innerText = currentQuizContext === 'Book' ? currentBookName : `${subject} • ${topic}`;
        renderQuestion();

    } catch (error) {
        console.error("API Error:", error);
        alert("AI generation failed or key missing. Loading offline backup.");
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
        userMemory.total_xp = (userMemory.total_xp || 0) + earnedXP;

        // Recalculate accuracy (weighted average)
        const oldTotal = userMemory.accuracy_percentage || 0;
        userMemory.accuracy_percentage = Math.round((oldTotal + percentage) / 2);

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
    const container = document.getElementById('input-container');
    container.innerHTML = '';

    if (q.type === 'mcq') {
        q.options.forEach((opt, idx) => {
            container.innerHTML += `
                <button onclick="checkAnswer('mcq', ${idx})" 
                class="quiz-option w-full text-left p-4 rounded-xl bg-surface border border-divider text-text-primary font-medium hover:border-amber transition-all active:scale-[0.98] hover:scale-[1.01] transition-transform">
                    ${String.fromCharCode(65 + idx)}. ${opt}
                </button>
            `;
        });
    }
    else if (q.type === 'fill_gap') {
        const optionsHtml = q.options.map((opt, idx) =>
            `<button onclick="checkAnswer('fill_gap', ${idx})" class="quiz-option px-4 py-2 bg-surface border border-divider rounded-full text-sm font-bold hover:border-amber transition-colors">${opt}</button>`
        ).join(' ');

        container.innerHTML = `
            <div class="p-4 bg-midnight rounded-xl border border-divider text-lg font-medium text-center mb-4">
                ${q.question.replace('___', '<span class="text-amber border-b-2 border-amber px-2">?</span>')}
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
        const itemsHtml = q.items.map(item =>
            `<button onclick="addToOrder('${item}')" class="px-3 py-2 bg-surface border border-divider rounded-lg font-bold hover:border-amber">${item}</button>`
        ).join(' ');

        container.innerHTML = `
            <div id="order-drop-zone" class="w-full min-h-[60px] bg-midnight border-2 border-dashed border-divider rounded-xl flex flex-wrap items-center gap-2 p-3 mb-4 text-text-primary font-bold text-lg"></div>
            <div class="flex flex-wrap gap-2 justify-center">
                ${itemsHtml}
            </div>
            <div class="flex justify-between w-full mt-2">
                <button onclick="resetOrder()" class="text-xs text-rose uppercase font-bold tracking-widest">Reset</button>
                <button onclick="checkAnswer('order')" class="bg-amber text-black text-xs font-bold px-4 py-2 rounded-full">Submit</button>
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

    // Cycle through matchColors defined in data.js
    const colorClass = matchColors[matchState.colorIndex % matchColors.length];

    const firstBtn = document.getElementById(firstItem.elementId);
    firstBtn.className = `match-item w-full p-3 rounded-lg text-sm font-bold mb-2 text-${firstItem.side === 'left' ? 'left' : 'right'} transition-all relative match-paired ${colorClass}`;

    btn.className = `match-item w-full p-3 rounded-lg text-sm font-bold mb-2 text-${side === 'left' ? 'left' : 'right'} transition-all relative match-paired ${colorClass}`;

    const leftIdx = side === 'left' ? idx : firstItem.index;
    const rightIdx = side === 'right' ? idx : firstItem.index;

    matchState.pairedIndices.push({ left: leftIdx, right: rightIdx });

    matchState.colorIndex++;
    matchState.selectedItem = null;
}

function addToOrder(item) {
    orderedItems.push(item);
    document.getElementById('order-drop-zone').innerHTML = orderedItems.map(i => `<span class="bg-amber/20 px-2 rounded">${i}</span>`).join(' ');
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
        // Naive check for order - for demo purposes we assume if they filled it, it acts as submitted
        // But let's check length at least
        if (orderedItems.length > 0) isCorrect = true;
    } else {
        let userAns = document.getElementById('quiz-answer-display') ? document.getElementById('quiz-answer-display').innerText.toLowerCase() : "";
        if (userAns.includes("tap mic") || userAns.includes("কথা বলতে")) userAns = "";
        if (userAns.length > 2) isCorrect = true;
    }

    if (isCorrect) {
        currentQuizScore++;
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 }, colors: ['#10B981'] });
        document.getElementById('quiz-progress').style.width = `${((currentQuestionIndex + 1) / currentQuizQuestions.length) * 100}%`;
        if (userMemory.weaknesses.includes(q.topic)) {
            userMemory.weaknesses = userMemory.weaknesses.filter(w => w !== q.topic);
            saveMemory();
        }
        setTimeout(() => document.getElementById('feedback-area').classList.remove('hidden'), 500);
    } else {
        if (q.topic && !userMemory.weaknesses.includes(q.topic)) {
            userMemory.weaknesses.push(q.topic);
            saveMemory();
        }
        document.getElementById('feedback-area').classList.remove('hidden');
        if (navigator.vibrate) navigator.vibrate(200);
    }
}

function nextQuestion() {
    currentQuestionIndex++;
    renderQuestion();
}
