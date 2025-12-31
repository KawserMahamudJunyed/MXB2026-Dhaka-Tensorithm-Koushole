// --- AUTH LOGIC ---

// State
let isAuthenticated = false;
let userProfile = {};

// Init Auth Listener
if (window.supabaseClient) {
    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session) {
            isAuthenticated = true;
            userProfile = session.user.user_metadata || {};
            // If just signed up/in, might need to fetch profile from DB if not in metadata
            // For now, minimal metadata usage
        } else {
            isAuthenticated = false;
            userProfile = {};
        }
        checkAuth();
    });
} else {
    // Fallback for dev if config missing
    console.warn("Supabase client not ready. Auth listener disabled.");
}

// Init
function checkAuth() {
    const mainContent = document.getElementById('app-content');
    if (isAuthenticated) {
        showView('view-dashboard');
        document.querySelector('nav').classList.remove('hidden');
        document.querySelector('header').classList.remove('hidden');
        if (mainContent) mainContent.classList.add('pb-24');
        updateGreeting();
    } else {
        showView('view-landing');
        document.querySelector('nav').classList.add('hidden');
        document.querySelector('header').classList.add('hidden');
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

    if (authMode === 'signup') {
        loginTab.classList.remove('bg-amber', 'text-black', '!text-black', 'shadow-sm');
        loginTab.classList.add('text-text-secondary', 'hover:text-text-primary');
        loginTab.style.color = '';

        signupTab.classList.add('bg-amber', 'text-black', '!text-black', 'shadow-sm');
        signupTab.classList.remove('text-text-secondary', 'hover:text-text-primary');
        signupTab.style.color = 'black';

        signupFields.classList.remove('hidden');
        inputs.forEach(el => { el.disabled = false; el.required = true; });

        title.innerText = t('signupTitle');
        submitBtn.innerText = t('signupBtn');
        switchText.innerHTML = `${t('haveAccount')} <b class="text-amber">${t('loginBtn')}</b>`;

    } else {
        signupTab.classList.remove('bg-amber', 'text-black', '!text-black', 'shadow-sm');
        signupTab.classList.add('text-text-secondary', 'hover:text-text-primary');
        signupTab.style.color = '';

        loginTab.classList.add('bg-amber', 'text-black', '!text-black', 'shadow-sm');
        loginTab.classList.remove('text-text-secondary', 'hover:text-text-primary');
        loginTab.style.color = 'black';

        signupFields.classList.add('hidden');
        inputs.forEach(el => { el.disabled = true; el.required = false; });

        title.innerText = t('loginTitle');
        submitBtn.innerText = t('loginBtn');
        switchText.innerHTML = `${t('noAccount')} <b class="text-amber">${t('signupBtn')}</b>`;
    }
}

async function handleAuth(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // Check Supabase Client
    if (!window.supabaseClient) {
        alert("Supabase not configured!");
        return;
    }

    const { email, password } = data;
    const submitBtn = document.getElementById('auth-submit-btn');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Processing...";
    submitBtn.disabled = true;

    try {
        if (authMode === 'signup') {
            // Supabase Sign Up
            const { data: { user, session }, error } = await window.supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: data.name,
                        nameBn: data.nameBn,
                        nickname: data.nickname,
                        nicknameBn: data.nicknameBn,
                        class: data.classLevel,
                        group: data.group
                    }
                }
            });

            if (error) throw error;
            alert("Signup successful! Check email for verification if enabled.");

        } else {
            // Supabase Sign In
            const { data: { user, session }, error } = await window.supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            // Listener handles state update
        }
    } catch (err) {
        console.error("Auth Error:", err);
        alert(err.message);
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
        e.target.reset();
    }
}

async function logout() {
    if (window.supabaseClient) {
        await window.supabaseClient.auth.signOut();
    }
    // Listener handles state update
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
    if (logoutBtn) logoutBtn.onclick = logout;
}

init();
