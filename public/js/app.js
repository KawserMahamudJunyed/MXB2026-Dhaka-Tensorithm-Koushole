// --- AUTH LOGIC ---

// --- AUTH & DATA LOGIC ---

// State
let isAuthenticated = false;
let userProfile = {};
let currentUserId = null;

// Default "Fresh User" State (Matches Supabase `learning_stats` table)
const DEFAULT_STATS = {
    total_xp: 0,
    day_streak: 0,
    accuracy_percentage: 0,
    weaknesses: [],
    badges: []
};

// Global Memory Objects
let userMemory = JSON.parse(JSON.stringify(DEFAULT_STATS));

// Init Auth Listener
if (window.supabaseClient) {
    window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            isAuthenticated = true;
            currentUserId = session.user.id;
            await loadUserData(currentUserId); // Fetch from Supabase
        } else {
            console.log("Logged out - Resetting State");
            isAuthenticated = false;
            userProfile = {};
            currentUserId = null;
            userMemory = JSON.parse(JSON.stringify(DEFAULT_STATS));
        }
        checkAuth();
        updateUI();
    });
} else {
    console.warn("Supabase client not ready. Auth listener disabled.");
}

// Fetch user data from Supabase tables
async function loadUserData(userId) {
    if (!window.supabaseClient) return;

    try {
        // 1. Fetch Profile
        const { data: profile, error: profileError } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (profileError && profileError.code !== 'PGRST116') {
            console.error("Profile fetch error:", profileError);
        }

        if (profile) {
            userProfile = {
                name: profile.full_name,
                nameBn: profile.full_name_bn,
                nickname: profile.nickname,
                nicknameBn: profile.nickname_bn,
                class: profile.class,
                group: profile.group_name
            };
            console.log("Loaded Profile:", userProfile);
        } else {
            // Use auth metadata as fallback
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            userProfile = user?.user_metadata || {};
        }

        // 2. Fetch Learning Stats
        const { data: stats, error: statsError } = await window.supabaseClient
            .from('learning_stats')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (statsError && statsError.code !== 'PGRST116') {
            console.error("Stats fetch error:", statsError);
        }

        if (stats) {
            userMemory = {
                total_xp: stats.total_xp || 0,
                day_streak: stats.day_streak || 0,
                accuracy_percentage: stats.accuracy_percentage || 0,
                weaknesses: stats.weaknesses || [],
                badges: stats.badges || []
            };
            console.log("Loaded Stats:", userMemory);
        } else {
            // New user - create initial stats row
            console.log("New user - creating initial stats");
            userMemory = JSON.parse(JSON.stringify(DEFAULT_STATS));
            await saveMemory(); // Create the row
        }

    } catch (err) {
        console.error("loadUserData error:", err);
    }
}

// Save user stats to Supabase
async function saveMemory() {
    if (!currentUserId || !window.supabaseClient) return;

    try {
        const { error } = await window.supabaseClient
            .from('learning_stats')
            .upsert({
                user_id: currentUserId,
                total_xp: userMemory.total_xp,
                day_streak: userMemory.day_streak,
                accuracy_percentage: userMemory.accuracy_percentage,
                weaknesses: userMemory.weaknesses,
                badges: userMemory.badges
            }, { onConflict: 'user_id' });

        if (error) {
            console.error("Save stats error:", error);
        } else {
            console.log("Stats saved to Supabase");
            updateUI();
        }
    } catch (err) {
        console.error("saveMemory error:", err);
    }
}
// Time-based greeting with user nickname
function updateGreeting() {
    const hour = new Date().getHours();
    let timeGreeting;

    if (currentLang === 'bn') {
        if (hour < 12) timeGreeting = 'শুভ সকাল';
        else if (hour < 17) timeGreeting = 'শুভ দুপুর';
        else if (hour < 20) timeGreeting = 'শুভ সন্ধ্যা';
        else timeGreeting = 'শুভ রাত্রি';
    } else {
        if (hour < 12) timeGreeting = 'Good Morning';
        else if (hour < 17) timeGreeting = 'Good Afternoon';
        else if (hour < 20) timeGreeting = 'Good Evening';
        else timeGreeting = 'Good Night';
    }

    // Get nickname based on language
    const nick = currentLang === 'bn'
        ? (userProfile.nicknameBn || userProfile.nickname || '')
        : (userProfile.nickname || userProfile.name || '');

    const fullGreeting = nick ? `${timeGreeting}, ${nick}! 🚀` : `${timeGreeting}! 🚀`;

    // Update greeting element
    const greetingEl = document.querySelector('[data-key="greeting"]');
    if (greetingEl) greetingEl.innerText = fullGreeting;
}

// Init
function checkAuth() {
    const mainContent = document.getElementById('app-content');
    const mainHeader = document.getElementById('main-header') || document.querySelector('header');
    const mainNav = document.getElementById('main-nav') || document.querySelector('nav');

    if (isAuthenticated) {
        showView('view-dashboard');
        if (mainNav) mainNav.classList.remove('hidden');
        if (mainHeader) mainHeader.classList.remove('hidden');
        if (mainContent) mainContent.classList.add('pb-24');
        updateGreeting();
    } else {
        showView('view-landing');
        if (mainNav) mainNav.classList.add('hidden');
        if (mainHeader) mainHeader.classList.add('hidden');
        if (mainContent) mainContent.classList.remove('pb-24');
    }
}

function showView(viewId) {
    document.querySelectorAll('[id^="view-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    const view = document.getElementById(viewId);
    view.classList.remove('fade-in');
    void view.offsetWidth;
    view.classList.add('fade-in');
}

function goToAuth() {
    showView('view-auth');
    toggleAuthMode('login'); // Force init form
}

let authMode = 'login';

function toggleAuthMode(mode) {
    if (mode) authMode = mode;
    else authMode = authMode === 'login' ? 'signup' : 'login';

    const loginTab = document.getElementById('tab-login');
    const signupTab = document.getElementById('tab-signup');
    const signupFields = document.getElementById('signup-fields');
    const submitBtn = document.getElementById('auth-submit-btn');
    const switchText = document.getElementById('auth-switch-text');
    const inputs = signupFields.querySelectorAll('input, select');
    const title = document.getElementById('auth-title');

    // Reset styles
    loginTab.style.color = '';
    signupTab.style.color = '';

    if (authMode === 'signup') {
        loginTab.classList.remove('bg-amber', 'text-black', '!text-black', 'shadow-sm');
        loginTab.classList.add('text-text-secondary', 'hover:text-text-primary');

        signupTab.classList.add('bg-amber', 'text-black', '!text-black', 'shadow-sm');
        signupTab.classList.remove('text-text-secondary', 'hover:text-text-primary');
        signupTab.style.color = 'black'; // Force

        signupFields.classList.remove('hidden');
        inputs.forEach(el => { el.disabled = false; el.required = true; });

        // Hide login-only elements
        const loginExtras = document.getElementById('login-extras');
        if (loginExtras) loginExtras.classList.add('hidden');

        title.innerText = t('signupTitle');
        submitBtn.innerText = t('signupBtn');
        switchText.innerHTML = `${t('haveAccount')} <b class="text-amber cursor-pointer" onclick="toggleAuthMode('login')">${t('loginBtn')}</b>`;

    } else {
        signupTab.classList.remove('bg-amber', 'text-black', '!text-black', 'shadow-sm');
        signupTab.classList.add('text-text-secondary', 'hover:text-text-primary');

        loginTab.classList.add('bg-amber', 'text-black', '!text-black', 'shadow-sm');
        loginTab.classList.remove('text-text-secondary', 'hover:text-text-primary');
        loginTab.style.color = 'black'; // Force

        signupFields.classList.add('hidden');
        inputs.forEach(el => { el.disabled = true; el.required = false; });

        // Show login-only elements
        const loginExtras = document.getElementById('login-extras');
        if (loginExtras) loginExtras.classList.remove('hidden');

        title.innerText = t('loginTitle');
        submitBtn.innerText = t('loginBtn');
        switchText.innerHTML = `${t('noAccount')} <b class="text-amber cursor-pointer" onclick="toggleAuthMode('signup')">${t('signupBtn')}</b>`;
    }
}

// Password Reset
async function showForgotPassword() {
    const email = prompt("Enter your email address for password reset:");
    if (!email) return;

    try {
        const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password'
        });

        if (error) {
            alert("Error: " + error.message);
        } else {
            alert("Password reset email sent! Check your inbox.");
        }
    } catch (err) {
        console.error("Password reset error:", err);
        alert("Failed to send reset email. Please try again.");
    }
}

async function handleAuth(e) {
    e.preventDefault();
    console.log("handleAuth triggered");
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // Check Supabase Client
    if (!window.supabaseClient) {
        alert("System Error: Supabase client is missing. Please refresh.");
        console.error("Supabase client missing in handleAuth");
        return;
    }

    const { email, password } = data;
    const submitBtn = document.getElementById('auth-submit-btn');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Processing...";
    submitBtn.disabled = true;

    try {
        if (authMode === 'signup') {
            console.log("Attempting Signup for:", email);

            // Supabase Sign Up - Storing metadata is CRITICAL for the nickname requirement
            const { data: { user, session }, error } = await window.supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: data.name,
                        nameBn: data.nameBn,
                        nickname: data.nickname, // Priority 1: Save this!
                        nicknameBn: data.nicknameBn,
                        class: data.classLevel,
                        group: data.group
                    }
                }
            });

            if (error) {
                console.error("Signup Supabase Error:", error);
                throw error;
            }

            console.log("Signup Successful. User:", user);

            // Create profile row in profiles table
            if (user) {
                const { error: profileError } = await window.supabaseClient
                    .from('profiles')
                    .insert({
                        user_id: user.id,
                        email: email,
                        full_name: data.name,
                        full_name_bn: data.nameBn,
                        nickname: data.nickname,
                        nickname_bn: data.nicknameBn,
                        class: data.classLevel,
                        group_name: data.group
                    });

                if (profileError) {
                    console.error("Profile insert error:", profileError);
                } else {
                    console.log("✅ Profile created in database");
                }

                // Create initial learning_stats row
                const { error: statsError } = await window.supabaseClient
                    .from('learning_stats')
                    .insert({
                        user_id: user.id,
                        total_xp: 0,
                        day_streak: 0,
                        accuracy_percentage: 0,
                        weaknesses: [],
                        badges: []
                    });

                if (statsError) {
                    console.error("Stats insert error:", statsError);
                } else {
                    console.log("✅ Learning stats initialized in database");
                }
            }

            alert("Signup successful! Please Log In.");

            // UX: Switch to Login mode automatically so they can sign in
            toggleAuthMode('login');

        } else {
            console.log("Attempting Login for:", email);
            // Supabase Sign In
            const { data: { user, session }, error } = await window.supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                console.error("Login Supabase Error:", error);
                throw error;
            }

            console.log("Login Successful. Session:", session);
            // Listener handles state update, but let's force a check to be sure
            if (session) {
                isAuthenticated = true;
                userProfile = session.user.user_metadata || {};
                checkAuth();
            }
        }
    } catch (err) {
        console.error("Auth Exception:", err);
        alert("Authentication Failed: " + err.message);
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
        if (authMode === 'signup') e.target.reset(); // Only reset on signup, keep email for login retry
    }
}

async function logout() {
    console.log("Logging out...");
    if (window.supabaseClient) {
        await window.supabaseClient.auth.signOut();
    }
    // Force reload to clear all state
    window.location.reload();
}

// Toggle Personal Details section
function togglePersonalDetails() {
    const content = document.getElementById('personal-details-content');
    const arrow = document.getElementById('personal-details-arrow');

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        arrow.classList.add('rotate-180');
        // Populate with user data
        populatePersonalDetails();
    } else {
        content.classList.add('hidden');
        arrow.classList.remove('rotate-180');
    }
}

// Populate Personal Details fields
function populatePersonalDetails() {
    const setField = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || '-';
    };

    setField('profile-fullname-en', userProfile.name);
    setField('profile-fullname-bn', userProfile.nameBn);
    setField('profile-nickname-en', userProfile.nickname);
    setField('profile-nickname-bn', userProfile.nicknameBn);
    setField('profile-email', userProfile.email);
    setField('profile-class', userProfile.class);
    setField('profile-group', userProfile.group);
}

function updateGreeting() {
    // Custom greeting using nickname
    const greetingEl = document.querySelector('[data-key="greeting"]');
    const nick = currentLang === 'bn' ? (userProfile.nicknameBn || userProfile.nickname) : userProfile.nickname;

    // Construct greeting based on lang
    if (currentLang === 'bn') {
        greetingEl.innerHTML = `শুভ সন্ধ্যা, ${nick || 'শিক্ষার্থী'}! 🚀`;
    } else {
        greetingEl.innerHTML = `Good Evening, ${nick || 'Student'}! 🚀`;
    }

    // Update Profile Name in View
    const profileName = document.querySelector('#view-profile h2');
    const profileGroup = document.querySelector('#view-profile p.body-font');
    if (profileName) {
        const fullName = currentLang === 'bn' ? (userProfile.nameBn || userProfile.name) : userProfile.name;
        profileName.innerText = fullName || "Student";
    }
    if (profileGroup) {
        const group = userProfile.group || "Science";
        const cls = userProfile.class || "10";
        profileGroup.innerText = `Class ${cls} • ${group} Group`;
    }
}


// --- LIBRARY & UPLOAD LOGIC ---
const libraryBooks = [
    { name: "Physics_Optics.pdf", date: "Added 5 days ago", status: "Ready", color: "sky" }
];

function renderLibrary() {
    const list = document.getElementById('library-list');
    list.innerHTML = '';
    libraryBooks.forEach((book, index) => {
        const isReady = book.status === "Ready";
        const statusColor = isReady ? "text-emerald" : "text-amber";
        const icon = book.color === "rose" ? "fa-file-pdf" : "fa-file-alt";

        list.innerHTML += `
        <div class="bg-surface border border-divider rounded-xl p-4 flex items-center justify-between group hover:border-amber/50 transition-colors">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-lg bg-${book.color}/10 text-${book.color} flex items-center justify-center">
                    <i class="fas ${icon}"></i>
                </div>
                <div>
                    <h4 class="text-text-primary font-bold text-sm">${book.name}</h4>
                    <p class="text-text-secondary text-[10px] flex items-center gap-2">
                        <span>${book.date}</span>
                        <span class="${statusColor} font-bold">• ${book.status}</span>
                    </p>
                </div>
            </div>
            <button class="w-8 h-8 rounded-full ${isReady ? 'bg-amber text-black hover:scale-110 cursor-pointer shadow-amber-glow' : 'bg-divider text-text-secondary cursor-not-allowed'} flex items-center justify-center transition-transform" 
                onclick="${isReady ? `openQuizConfig('${book.name}')` : ''}">
                <i class="fas fa-play text-xs"></i>
            </button>
        </div>`;
    });
}

document.getElementById('book-upload-input').addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        libraryBooks.unshift({
            name: file.name,
            date: "Just now",
            status: "Processing...",
            color: "emerald"
        });
        renderLibrary();
        setTimeout(() => {
            libraryBooks[0].status = "Ready";
            renderLibrary();
            alert(t("bookProcessed"));
        }, 2500);
    }
});

function updateProfileUI() {
    // Update XP
    document.getElementById('xp-display').innerText = userMemory.xp.toLocaleString();

    // Update Weakness Cloud
    const container = document.getElementById('weakness-cloud');
    if (userMemory.weaknesses.length === 0) {
        container.innerHTML = '<span class="text-xs text-text-secondary italic">No weaknesses detected yet. Keep learning!</span>';
    } else {
        container.innerHTML = userMemory.weaknesses.map(w =>
            `<span class="px-2 py-1 rounded-full bg-rose/10 text-rose text-xs border border-rose/30">${w}</span>`
        ).join('');
    }

    // Also update greeting/profile text
    updateGreeting();
}


// --- CHAT LOGIC ---

document.getElementById('file-upload-input').addEventListener('change', handleAttachment);
document.getElementById('image-upload-input').addEventListener('change', handleAttachment);

function handleAttachment(e) {
    const file = e.target.files[0];
    if (!file) return;
    const preview = document.getElementById('attachment-preview');
    preview.classList.remove('hidden');
    preview.innerHTML += `
        <div class="flex items-center gap-2 bg-surface border border-divider rounded-full px-3 py-1 text-xs text-text-primary shrink-0 animate-fade-in-up">
            <i class="fas ${file.type.startsWith('image/') ? 'fa-image text-sky' : 'fa-file text-amber'}"></i>
            ${file.name}
            <i class="fas fa-times cursor-pointer hover:text-rose" onclick="this.parentElement.remove()"></i>
        </div>
    `;
    e.target.value = '';
}

let recognition;
function toggleVoiceRecording(targetId) {
    if (!('webkitSpeechRecognition' in window)) {
        alert("Voice not supported in this browser. Try Chrome/Edge.");
        return;
    }

    let btn;
    if (targetId === 'chat-input') {
        btn = document.getElementById('mic-btn');
    } else {
        btn = document.querySelector(`button[onclick*="${targetId}"]`);
    }

    if (recognition && recognition.started) {
        recognition.stop();
        return;
    }
    recognition = new webkitSpeechRecognition();
    recognition.lang = currentLang === 'en' ? 'en-US' : 'bn-BD';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => {
        recognition.started = true;
        if (btn) btn.classList.add('recording-pulse');
        const target = document.getElementById(targetId);
        if (target && target.tagName === 'P') target.innerText = t("listening");
    };
    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        const target = document.getElementById(targetId);
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            target.value += (target.value ? ' ' : '') + text;
        } else {
            target.innerText = text;
        }
    };
    recognition.onend = () => {
        recognition.started = false;
        if (btn) btn.classList.remove('recording-pulse');
    };
    recognition.start();
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    const preview = document.getElementById('attachment-preview');
    const hasAttachments = preview.children.length > 0;
    if (!text && !hasAttachments) return;

    const chatContainer = document.getElementById('chat-messages');
    let attachmentHTML = '';
    if (hasAttachments) {
        attachmentHTML = `<div class="mt-2 text-[10px] text-text-secondary italic"><i class="fas fa-paperclip"></i> ${preview.children.length} attachment(s) sent</div>`;
    }

    chatContainer.innerHTML += `
        <div class="flex gap-3 flex-row-reverse animate-fade-in-up">
            <div class="w-8 h-8 rounded-full bg-divider flex items-center justify-center text-text-secondary text-xs">KM</div>
            <div class="bg-amber text-black font-medium p-3 rounded-2xl rounded-tr-none max-w-[85%] text-sm shadow-amber-glow body-font">
                ${text || "Sent attachments"}
                ${attachmentHTML}
            </div>
        </div>`;

    input.value = '';
    preview.innerHTML = '';
    preview.classList.add('hidden');
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const typingId = 'typing-' + Date.now();
    chatContainer.innerHTML += `
        <div id="${typingId}" class="flex gap-3 animate-fade-in-up">
            <div class="w-8 h-8 rounded-full bg-amber/20 border border-amber/50 flex items-center justify-center text-amber text-xs"><i class="fas fa-robot"></i></div>
            <div class="bg-surface border border-divider p-3 rounded-2xl rounded-tl-none text-text-secondary text-xs italic">
                Thinking...
            </div>
        </div>`;
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        let memoryContext = "";
        if (userMemory.weaknesses.length > 0) {
            memoryContext = `\n[System Note: This student has struggled with the following topics in quizzes: ${userMemory.weaknesses.join(', ')}. If relevant to their question, explain these concepts simply and offer examples to help them improve.]`;
        }

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `You are Koushole, a friendly AI tutor. Reply in ${currentLang === 'bn' ? 'Bangla' : 'English'}.${memoryContext}\nStudent said: ${text}`
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        const aiText = data.reply;
        document.getElementById(typingId).remove();
        appendAIMessage(aiText);

    } catch (error) {
        document.getElementById(typingId).remove();
        appendAIMessage(t("connError"));
        console.error(error);
    }
}

function appendAIMessage(markdownText) {
    const chatContainer = document.getElementById('chat-messages');
    const htmlContent = marked.parse(markdownText);
    chatContainer.innerHTML += `
        <div class="flex gap-3 animate-fade-in-up">
            <div class="w-8 h-8 rounded-full bg-amber/20 border border-amber/50 flex items-center justify-center text-amber text-xs"><i class="fas fa-robot"></i></div>
            <div class="bg-surface border border-divider text-text-primary p-3 rounded-2xl rounded-tl-none max-w-[85%] text-sm leading-relaxed shadow-sm transition-colors prose prose-invert prose-sm">
                ${htmlContent}
            </div>
        </div>`;
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// --- INIT ---
function init() {
    document.getElementById('app-logo').src = 'Koushole_White.svg';
    checkAuth(); // Check auth state on load
    renderLibrary();
    updateProfileUI(); // Load memory
    updateChapters(); // Init chapter list

    // Initialize Chart
    const ctx = document.getElementById('growthChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(245, 158, 11, 0.5)');
    gradient.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Focus Score',
                data: [45, 59, 80, 81, 56, 95, 100],
                borderColor: '#F59E0B',
                backgroundColor: gradient,
                borderWidth: 2,
                pointBackgroundColor: '#F59E0B',
                pointBorderColor: '#FFF',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(156, 163, 175, 0.2)' }, ticks: { color: '#9CA3AF' } },
                x: { grid: { display: false }, ticks: { color: '#9CA3AF' } }
            }
        }
    });

    document.getElementById('chat-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') sendMessage();
    });

    // Wire up Logout
    const logoutBtn = document.querySelector('[data-key="logOut"]');
    if (logoutBtn) logoutBtn.onclick = async () => {
        await window.supabaseClient.auth.signOut();
        window.location.reload(); // Force reload to clear memory
    };
}

// --- UI UPDATES (GLOBAL SCOPE) ---
function updateUI() {
    if (!isAuthenticated) return;

    // 1. Greeting
    updateGreeting();

    // 2. Streak (Header + Profile)
    const streakValue = userMemory.day_streak || 0;
    const streakText = `${streakValue} ${currentLang === 'bn' ? 'দিন' : 'Days'}`;

    // Update all data-key="streak" elements
    document.querySelectorAll('[data-key="streak"]').forEach(el => el.innerText = streakText);

    // Also target by ID for header
    const headerStreak = document.getElementById('streak-text');
    if (headerStreak) headerStreak.innerText = streakText;

    // Profile page streak (just the number)
    const streakProfileEl = document.getElementById('streak-profile-display');
    if (streakProfileEl) streakProfileEl.innerText = streakValue;

    // 3. XP / Score
    const xpEl = document.getElementById('xp-display');
    if (xpEl) xpEl.innerText = (userMemory.total_xp || 0).toLocaleString();

    // 4. Accuracy
    const accEl = document.getElementById('accuracy-display');
    if (accEl) accEl.innerText = `${userMemory.accuracy_percentage || 0}%`;

    // 5. Update Profile Info (with Bangla support - FULL NAME)
    const pName = document.querySelector('#view-profile h2');
    const pDetails = document.querySelector('#view-profile p.body-font');

    // Use Bangla full name if in Bangla mode, otherwise English full name
    const displayName = currentLang === 'bn'
        ? (userProfile.nameBn || userProfile.name || 'শিক্ষার্থী')
        : (userProfile.name || 'Student');

    if (pName) pName.innerText = displayName;
    if (pDetails) pDetails.innerText = `Class ${userProfile.class || '10'} • ${userProfile.group || 'Science'} Group`;

    // 6. Update Initials (based on NICKNAME, fallback to name)
    const nickForInitials = userProfile.nickname || userProfile.name || "S";
    const initials = nickForInitials.charAt(0).toUpperCase();
    document.querySelectorAll('#profile-initials').forEach(el => el.innerText = initials);
    const headerInitials = document.getElementById('header-profile-initials');
    if (headerInitials) headerInitials.innerText = initials;

    // 7. Weakness Cloud
    const weaknessCloud = document.getElementById('weakness-cloud');
    if (weaknessCloud) {
        if (userMemory.weaknesses && userMemory.weaknesses.length > 0) {
            weaknessCloud.innerHTML = userMemory.weaknesses.map(w =>
                `<span class="px-2 py-1 rounded-full bg-rose/10 text-rose text-xs border border-rose/30">${w}</span>`
            ).join('');
        } else {
            weaknessCloud.innerHTML = '<span class="text-xs text-text-secondary italic">Keep learning to discover focus areas!</span>';
        }
    }

    // 8. Badges/Achievements
    const badgesContainer = document.getElementById('badges-container');
    if (badgesContainer && userMemory.badges) {
        badgesContainer.innerHTML = userMemory.badges.map(b =>
            `<span class="px-3 py-1 rounded-full bg-amber/10 text-amber text-xs border border-amber/30">${b}</span>`
        ).join('') || '<span class="text-xs text-text-secondary italic">Earn badges by completing quizzes!</span>';
    }

    // 9. Dashboard Dynamic Sections (show only if user has data)
    const welcomeSection = document.getElementById('new-user-welcome');
    const continueSection = document.getElementById('continue-learning-section');
    const attentionSection = document.getElementById('needs-attention-section');

    const hasQuizHistory = userMemory.total_quizzes_completed > 0 || userMemory.total_xp > 0;
    const hasWeaknesses = userMemory.weaknesses && userMemory.weaknesses.length > 0;

    if (hasQuizHistory) {
        // User has quiz history - hide welcome, show sections
        if (welcomeSection) welcomeSection.classList.add('hidden');
        if (continueSection) continueSection.classList.remove('hidden');

        if (hasWeaknesses && attentionSection) {
            attentionSection.classList.remove('hidden');
            // Populate weaknesses
            const container = document.getElementById('needs-attention-container');
            if (container) {
                container.innerHTML = userMemory.weaknesses.map(w => `
                    <div class="group bg-surface rounded-xl p-4 border border-divider flex items-center justify-between transition-colors duration-300 hover:border-rose/30">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-lg bg-surface border border-rose/30 flex items-center justify-center text-rose transition-colors group-hover:bg-rose/10">
                                <i class="fas fa-exclamation group-hover:rotate-12 transition-transform"></i>
                            </div>
                            <div>
                                <h4 class="text-text-primary text-lg font-semibold title-font transition-colors">${w}</h4>
                                <p class="text-text-secondary text-xs body-font">Needs practice</p>
                            </div>
                        </div>
                        <button onclick="openQuizConfig(null, null, '${w}')"
                            class="px-4 py-2 rounded-full border border-amber text-amber text-xs font-bold hover:bg-amber hover:text-black transition-colors body-font">
                            Retry
                        </button>
                    </div>
                `).join('');
            }
        }
    } else {
        // New user - show welcome, hide other sections
        if (welcomeSection) welcomeSection.classList.remove('hidden');
        if (continueSection) continueSection.classList.add('hidden');
        if (attentionSection) attentionSection.classList.add('hidden');
    }
}

init();
