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
window.userMemory = userMemory; // Expose for quiz.js

// Wait for Supabase client to be ready then set up auth listener
function waitForSupabase(callback, maxWait = 5000) {
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
        if (window.supabaseClient) {
            clearInterval(checkInterval);
            console.log("✅ Supabase client ready, setting up auth listener");
            callback();
        } else if (Date.now() - startTime > maxWait) {
            clearInterval(checkInterval);
            console.error("❌ Supabase client not available after waiting");
        }
    }, 100);
}

// Init Auth Listener (with wait)
waitForSupabase(() => {
    window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.email);
        if (session) {
            isAuthenticated = true;
            currentUserId = session.user.id;
            await loadUserData(currentUserId); // Fetch from Supabase
            fetchBadgeDefinitions(); // Load badge names from DB
            // Load user-specific data immediately when session restores
            fetchLibraryBooks();
            fetchChatHistory();
        } else {
            console.log("Logged out - Resetting State");
            isAuthenticated = false;
            userProfile = {};
            currentUserId = null;
            userMemory = JSON.parse(JSON.stringify(DEFAULT_STATS));
        }
        // Only change view on meaningful auth events
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
            checkAuth();
        }
        updateUI();
    });
});

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

        // Always fetch auth user to get email
        const { data: { user } } = await window.supabaseClient.auth.getUser();

        // Helper to get name from email
        const getNameFromEmail = () => user?.email ? user.email.split('@')[0] : 'Student';

        if (profile) {
            userProfile = {
                name: profile.full_name || getNameFromEmail(),
                nameBn: profile.full_name_bn,
                nickname: profile.nickname || (profile.full_name ? profile.full_name.split(' ')[0] : getNameFromEmail()),
                nicknameBn: profile.nickname_bn,
                class: profile.class,
                group: profile.group_name || profile.group, // Attempt fallback if column name differs
                email: user?.email // Add email from Auth
            };
            console.log("Loaded Profile:", userProfile);
        } else {
            // Use auth metadata as fallback
            userProfile = user?.user_metadata || {};
            // Force name if metadata missing
            if (!userProfile.name && !userProfile.full_name) {
                userProfile.name = getNameFromEmail();
                userProfile.nickname = userProfile.name;
            }
            userProfile.email = user?.email;
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
                total_quizzes_completed: stats.total_quizzes_completed || 0,
                day_streak: stats.day_streak || 0,
                accuracy_percentage: stats.accuracy_percentage || 0,
                weaknesses: stats.weaknesses || [],
                badges: stats.badges || []
            };
            console.log("Loaded Stats:", userMemory);

            // Retroactively check for missing badges
            await checkMissingBadges(userId, stats);
        } else {
            // New user - create initial stats row
            console.log("New user - creating initial stats");
            userMemory = JSON.parse(JSON.stringify(DEFAULT_STATS));
            await saveMemory(); // Create the row
        }

        // Refresh UI with loaded data
        updateUI();
        updateProfileUI();

        // Refresh chart with quiz history
        if (typeof initLearningChart === 'function') {
            initLearningChart();
        }

        // Initialize Notifications
        await checkDailyReminder();
        fetchNotifications();

    } catch (err) {
        console.error("loadUserData error:", err);
    }
}

// Retroactively check and award missing badges on app load
async function checkMissingBadges(userId, stats) {
    const currentBadges = stats.badges || [];
    const newBadges = [...currentBadges];
    let badgeAwarded = false;

    const totalXP = stats.total_xp || 0;
    const quizCount = stats.total_quizzes_completed || 0;
    const streak = stats.day_streak || 0;

    // XP Badges
    if (totalXP >= 500 && !currentBadges.includes('xp_500')) {
        newBadges.push('xp_500');
        badgeAwarded = true;
        console.log('🏅 Retroactively awarding XP Hunter badge');
    }
    if (totalXP >= 2000 && !currentBadges.includes('xp_2000')) {
        newBadges.push('xp_2000');
        badgeAwarded = true;
    }
    if (totalXP >= 5000 && !currentBadges.includes('xp_5000')) {
        newBadges.push('xp_5000');
        badgeAwarded = true;
    }

    // Quiz Count Badges
    if (quizCount >= 10 && !currentBadges.includes('quiz_10')) {
        newBadges.push('quiz_10');
        badgeAwarded = true;
    }
    if (quizCount >= 50 && !currentBadges.includes('quiz_50')) {
        newBadges.push('quiz_50');
        badgeAwarded = true;
    }
    if (quizCount >= 100 && !currentBadges.includes('quiz_100')) {
        newBadges.push('quiz_100');
        badgeAwarded = true;
    }

    // Streak Badges
    if (streak >= 3 && !currentBadges.includes('streak_3')) {
        newBadges.push('streak_3');
        badgeAwarded = true;
    }
    if (streak >= 7 && !currentBadges.includes('streak_7')) {
        newBadges.push('streak_7');
        badgeAwarded = true;
    }
    if (streak >= 30 && !currentBadges.includes('streak_30')) {
        newBadges.push('streak_30');
        badgeAwarded = true;
    }

    // Save if any badges were awarded
    if (badgeAwarded) {
        try {
            const { error } = await window.supabaseClient
                .from('learning_stats')
                .update({ badges: newBadges })
                .eq('user_id', userId);

            if (!error) {
                userMemory.badges = newBadges;
                console.log('✅ Retroactively awarded badges:', newBadges.filter(b => !currentBadges.includes(b)));
            } else {
                console.error('Failed to save retroactive badges:', error);
            }
        } catch (err) {
            console.error('Error saving retroactive badges:', err);
        }
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
// function updateGreeting() removed (duplicate)

// Init
function checkAuth() {
    const mainContent = document.getElementById('app-content');
    const mainHeader = document.getElementById('main-header') || document.querySelector('header');
    const mainNav = document.getElementById('main-nav') || document.querySelector('nav');

    // Setup Signup Form Logic
    setupSignupLogic();

    if (isAuthenticated) {
        showView('view-dashboard');
        if (mainNav) mainNav.classList.remove('hidden');
        if (mainHeader) mainHeader.classList.remove('hidden');
        if (mainContent) mainContent.classList.add('pb-24');
        updateGreeting();

        // Fetch Official Resources on Auth Success
        if (typeof fetchOfficialResources === 'function') {
            fetchOfficialResources();
        }
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
    const loginExtras = document.getElementById('login-extras');

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

        if (loginExtras) loginExtras.classList.add('hidden');

        // Show password strength indicator for signup
        const strengthContainer = document.getElementById('auth-strength-container');
        if (strengthContainer) strengthContainer.classList.remove('hidden');

        title.setAttribute('data-key', 'signupTitle');
        title.innerText = t('signupTitle');
        submitBtn.setAttribute('data-key', 'signupBtn');
        submitBtn.innerText = t('signupBtn');

        switchText.innerHTML = `<span data-key="haveAccount">${t('haveAccount')}</span> <b class="text-amber cursor-pointer" onclick="toggleAuthMode('login')" data-key="loginToggle">${t('loginToggle')}</b>`;

    } else {
        signupTab.classList.remove('bg-amber', 'text-black', '!text-black', 'shadow-sm');
        signupTab.classList.add('text-text-secondary', 'hover:text-text-primary');

        loginTab.classList.add('bg-amber', 'text-black', '!text-black', 'shadow-sm');
        loginTab.classList.remove('text-text-secondary', 'hover:text-text-primary');
        loginTab.style.color = 'black'; // Force

        signupFields.classList.add('hidden');
        inputs.forEach(el => { el.disabled = true; el.required = false; });

        if (loginExtras) loginExtras.classList.remove('hidden');

        title.setAttribute('data-key', 'loginTitle');
        title.innerText = t('loginTitle');
        submitBtn.setAttribute('data-key', 'loginBtn');
        submitBtn.innerText = t('loginBtn');

        switchText.innerHTML = `<span data-key="noAccount">${t('noAccount')}</span> <b class="text-amber cursor-pointer" onclick="toggleAuthMode('signup')" data-key="signupToggle">${t('signupToggle')}</b>`;
    }
}

// Toggle password visibility in auth form
function toggleAuthPassword() {
    const input = document.getElementById('auth-password');
    const icon = document.getElementById('auth-eye');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-regular fa-eye-slash text-sm';
    } else {
        input.type = 'password';
        icon.className = 'fa-regular fa-eye text-sm';
    }
}

// Password strength checker for signup
function checkAuthPasswordStrength() {
    const container = document.getElementById('auth-strength-container');
    if (!container || container.classList.contains('hidden')) return;

    const password = document.getElementById('auth-password').value;
    const strengthBar = document.getElementById('auth-strength-bar');
    const strengthText = document.getElementById('auth-strength-text');

    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (password.length === 0) {
        strengthBar.style.width = '0%';
        strengthBar.className = 'h-full w-0 rounded-full transition-all duration-300';
        strengthText.textContent = 'Min 6 characters';
        strengthText.className = 'text-xs text-text-secondary';
        return;
    }

    let color, text;
    if (strength <= 2) {
        color = 'bg-red-500';
        text = 'Weak';
    } else if (strength <= 3) {
        color = 'bg-yellow-500';
        text = 'Moderate';
    } else {
        color = 'bg-green-500';
        text = 'Strong';
    }

    strengthBar.className = `h-full rounded-full transition-all duration-300 ${color}`;
    strengthBar.style.width = `${(strength / 5) * 100}%`;
    strengthText.textContent = text;
    strengthText.className = `text-xs ${color.replace('bg-', 'text-')}`;
}

// Password Reset
function showForgotPassword() {
    document.getElementById('forgot-password-modal').classList.remove('hidden');
    document.getElementById('forgot-email').focus();
}

function closeForgotPasswordModal() {
    document.getElementById('forgot-password-modal').classList.add('hidden');
    document.getElementById('forgot-email').value = '';
}

async function handleForgotPasswordSubmit(e) {
    e.preventDefault();

    const emailInput = document.getElementById('forgot-email');
    const submitBtn = document.getElementById('forgot-submit-btn');
    const originalBtnContent = submitBtn.innerHTML;

    const email = emailInput.value.trim();
    if (!email) return;

    // Set loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
        const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password.html'
        });

        if (error) {
            alert("Error: " + error.message);
        } else {
            // Success state in modal
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Sent!';
            submitBtn.classList.remove('bg-amber', 'text-black');
            submitBtn.classList.add('bg-green-500', 'text-white');

            setTimeout(() => {
                alert("Password reset email sent! Check your inbox.");
                closeForgotPasswordModal();

                // Reset button state
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
                submitBtn.classList.add('bg-amber', 'text-black');
                submitBtn.classList.remove('bg-green-500', 'text-white');
            }, 1000);
        }
    } catch (err) {
        console.error("Password reset error:", err);
        alert("Failed to send reset email. Please try again.");
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnContent;
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

            // Determine Group or Department
            let finalGroup = data.group;
            if (data.classLevel === 'University') {
                if (data.department === 'Other') {
                    finalGroup = data.customDepartment || 'University Student';
                } else {
                    finalGroup = data.department;
                }
            } else if (['6', '7', '8'].includes(data.classLevel)) {
                finalGroup = null; // Junior classes have no group
            }

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
                        group: finalGroup // Save Department as Group for University students
                    }
                }
            });

            if (error) {
                console.error("Signup Supabase Error:", error);
                throw error;
            }

            console.log("Signup Successful. User:", user);

            // Create profile row in profiles table (Use UPSERT to avoid trigger conflict)
            if (user) {
                const profileData = {
                    user_id: user.id,
                    email: email,
                    full_name: data.name,
                    full_name_bn: data.nameBn,
                    nickname: data.nickname,
                    nickname_bn: data.nicknameBn,
                    class: data.classLevel,
                    group_name: finalGroup,
                    // Map fields for schema completeness
                    education_level: data.classLevel,
                    department: data.classLevel === 'University' ? finalGroup : null
                };

                const { error: profileError } = await window.supabaseClient
                    .from('profiles')
                    .upsert(profileData, { onConflict: 'user_id' });

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
        // Only restore button text on error - on success, toggleAuthMode handles it
        if (submitBtn.innerText === "Processing...") {
            submitBtn.innerText = authMode === 'login' ? t('loginBtn') : t('signupBtn');
        }
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
        arrow.classList.add('rotate-90');
        // Populate with user data
        populatePersonalDetails();
    } else {
        content.classList.add('hidden');
        arrow.classList.remove('rotate-90');
    }
}

// Toggle Chat History section
function toggleChatHistory() {
    const content = document.getElementById('chat-history-content');
    const arrow = document.getElementById('chat-history-arrow');

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        arrow.classList.add('rotate-90');
        loadChatHistory();
    } else {
        content.classList.add('hidden');
        arrow.classList.remove('rotate-90');
    }
}

// Load Chat History from Supabase
async function loadChatHistory() {
    if (!window.supabaseClient || !currentUserId) return;

    const listEl = document.getElementById('chat-history-list');
    listEl.innerHTML = '<p class="text-text-secondary text-xs italic">Loading...</p>';

    try {
        const { data, error } = await window.supabaseClient
            .from('chat_history')
            .select('*')
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: true })
            .limit(50);

        if (error) throw error;

        if (!data || data.length === 0) {
            listEl.innerHTML = '<p class="text-text-secondary text-xs italic">No chat history yet. Start a conversation!</p>';
            return;
        }

        listEl.innerHTML = data.map(msg => `
            <div class="p-2 rounded-lg ${msg.role === 'user' ? 'bg-amber/10 text-amber' : 'bg-white/5 text-text-primary'} text-xs">
                <span class="font-bold">${msg.role === 'user' ? 'You' : 'Koushole'}:</span>
                <span class="ml-1">${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}</span>
                <span class="block text-[9px] text-text-secondary mt-1">${new Date(msg.created_at).toLocaleString()}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Chat history error:', error);
        listEl.innerHTML = '<p class="text-rose text-xs">Failed to load history</p>';
    }
}

// Save chat message to Supabase
async function saveChatMessage(role, content) {
    if (!window.supabaseClient || !currentUserId) {
        console.warn('Cannot save chat: missing client or user');
        return;
    }

    try {
        const { error } = await window.supabaseClient
            .from('chat_history')
            .insert({ user_id: currentUserId, role, content });

        if (error) {
            console.error('Chat save error:', error.message);
        } else {
            console.log('Chat saved:', role);
        }
    } catch (error) {
        console.error('Failed to save message:', error);
    }
}

// Clear Chat History
// Clear Chat History
async function clearChatHistory() {
    if (!window.supabaseClient || !currentUserId) return;
    if (!confirm('Are you sure you want to delete all chat history?')) return;

    // Immediate UI feedback
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) chatContainer.innerHTML = '';

    // Clear sidebar list if open
    const historyList = document.getElementById('chat-history-list');
    if (historyList) historyList.innerHTML = '<p class="text-text-secondary text-xs italic">Clearing...</p>';

    try {
        const { error } = await window.supabaseClient
            .from('chat_history')
            .delete()
            .eq('user_id', currentUserId);

        if (error) throw error;

        // Refresh both views
        await loadChatHistory(); // Sidebar
        await fetchChatHistory(); // Main Chat

        // Show success toast/message
        if (chatContainer) {
            chatContainer.innerHTML = `
                <div class="flex gap-3 group animate-fade-in-up">
                    <div class="w-8 h-8 rounded-full bg-amber/20 border border-amber/50 flex items-center justify-center text-amber text-xs">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="bg-surface border border-divider text-text-primary p-3 rounded-2xl rounded-tl-none max-w-[85%] text-sm leading-relaxed shadow-sm transition-colors prose prose-invert prose-sm">
                        <span>Chat history cleared! How can I help you now?</span>
                    </div>
                </div>
            `;
        }

    } catch (error) {
        console.error('Failed to clear history:', error);
        alert("Failed to clear history. Please try again.");
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

    // Translate class and group for Bangla display
    const displayClass = translateClass(userProfile.class);
    const displayGroup = translateSubject(userProfile.group || userProfile.department);
    setField('profile-class', displayClass);
    setField('profile-group', displayGroup);

    // Hide group row for Class 6-8 (no groups for these classes)
    const groupRow = document.getElementById('profile-group-row');
    const classNum = parseInt(userProfile.class);
    const isClass6to8 = classNum >= 6 && classNum <= 8;

    if (groupRow) {
        groupRow.style.display = isClass6to8 ? 'none' : 'flex';
    }

    // For university students, change "Group" label to "Department"
    const isUniversity = userProfile.class === 'University' || userProfile.class === 'বিশ্ববিদ্যালয়';
    const groupLabel = document.getElementById('profile-group-label');
    if (groupLabel && isUniversity) {
        groupLabel.textContent = currentLang === 'bn' ? 'ডিপার্টমেন্ট' : 'Department';
    }
}

function updateGreeting() {
    // Custom greeting using nickname
    const greetingEl = document.querySelector('[data-key="greeting"]');
    const nick = currentLang === 'bn' ? (userProfile.nicknameBn || userProfile.nickname) : userProfile.nickname;

    // Performance-based motivational greetings (all day!)
    const streak = userMemory?.day_streak || 0;
    const accuracy = userMemory?.accuracy || 0;
    const totalQuizzes = userMemory?.total_quizzes || 0;

    let greetingEn, greetingBn, emoji;

    // Pick message and emoji based on performance
    if (streak >= 7) {
        greetingEn = "Unstoppable";
        greetingBn = "অপ্রতিরোধ্য";
        emoji = "💪";
    } else if (streak >= 3) {
        greetingEn = "On Fire";
        greetingBn = "জ্বলে উঠেছ";
        emoji = "🔥";
    } else if (accuracy >= 80 && totalQuizzes > 0) {
        greetingEn = "Star Performer";
        greetingBn = "তারকা শিক্ষার্থী";
        emoji = "⭐";
    } else if (totalQuizzes >= 10) {
        greetingEn = "Keep Going";
        greetingBn = "এগিয়ে চলো";
        emoji = "🎯";
    } else if (totalQuizzes > 0) {
        greetingEn = "Great Progress";
        greetingBn = "দারুণ অগ্রগতি";
        emoji = "📈";
    } else {
        greetingEn = "Happy Studying";
        greetingBn = "শুভ পড়াশোনা";
        emoji = "🚀";
    }

    // Construct greeting based on lang
    let displayNick = nick ? String(nick).trim() : '';
    if (!displayNick) displayNick = currentLang === 'bn' ? 'শিক্ষার্থী' : 'Student';

    if (currentLang === 'bn') {
        greetingEl.innerHTML = `${greetingBn}, ${displayNick}! ${emoji}`;
    } else {
        greetingEl.innerHTML = `${greetingEn}, ${displayNick}! ${emoji}`;
    }

    // Update Profile Name in View
    const profileName = document.querySelector('#view-profile h2');
    const profileGroup = document.querySelector('#view-profile p.body-font');
    if (profileName) {
        const fullName = currentLang === 'bn' ? (userProfile.nameBn || userProfile.name) : userProfile.name;
        profileName.innerText = fullName || "Student";
    }
    if (profileGroup) {
        let cls = userProfile.class || "10";
        let group = userProfile.group;

        // Check if Junior class (6-8) - no groups for these
        const isJunior = ['6', '7', '8'].includes(String(cls).trim());

        // Auto-detect University based on Group (Heuristic for corrupted data)
        const uniSubjects = ['CSE', 'EEE', 'BBA', 'English', 'Economics', 'Medical', 'Mathematics', 'Architecture', 'Law', 'Physics', 'Chemistry', 'Biology', 'Civil', 'Mechanical', 'Textile', 'MBBS', 'Pharmacy', 'Nursing', 'Accounting', 'Finance', 'Marketing', 'Sociology', 'Bangla', 'History', 'Philosophy'];
        const isUniSubject = group && uniSubjects.some(s => group.includes(s));

        let isUniversity = String(cls).trim() === 'University' || String(cls).trim() === 'বিশ্ববিদ্যালয়' || String(cls).includes('University');

        if (isUniSubject) {
            isUniversity = true;
            if (cls === "10" || !cls) cls = "University"; // Correct the display
        }

        if (isUniversity) {
            const deptTranslated = translateSubject(group) || (currentLang === 'bn' ? 'বিভাগ নির্বাচন করা হয়নি' : 'No Dept Selected');
            const uniLabel = currentLang === 'bn' ? 'বিশ্ববিদ্যালয়' : 'University';
            const suffix = currentLang === 'bn' ? 'ডিপার্টমেন্ট' : 'Department';
            profileGroup.innerText = `${uniLabel} • ${deptTranslated} ${suffix}`;
        } else if (isJunior) {
            // Class 6-8: No group needed
            const clsTranslated = translateClass(cls);
            profileGroup.innerText = currentLang === 'bn' ? `${clsTranslated} শ্রেণি` : `Class ${cls}`;
        } else {
            // Class 9-12: Show group
            const clsTranslated = translateClass(cls);
            const groupTranslated = translateSubject(group) || (currentLang === 'bn' ? 'গ্রুপ নির্বাচন করা হয়নি' : 'No Group');
            const suffix = currentLang === 'bn' ? 'বিভাগ' : 'Group';
            profileGroup.innerText = currentLang === 'bn'
                ? `${clsTranslated} শ্রেণি • ${groupTranslated} ${suffix}`
                : `Class ${cls} • ${group || 'No Group'} ${suffix}`;
        }
    }
}


// --- LIBRARY & UPLOAD LOGIC ---
// --- LIBRARY & UPLOAD LOGIC ---
let libraryBooks = [];

async function fetchLibraryBooks() {
    if (!window.supabaseClient) return;

    // Fetch official resources in parallel
    fetchOfficialResources();

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            console.log('Library: No user logged in');
            return;
        }
        console.log('Library: Fetching for user', user.id);

        const { data, error } = await window.supabaseClient
            .from('library_books')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        console.log('Library query result:', data?.length || 0, 'books, error:', error);

        if (error) {
            console.error('Library fetch error:', error);
            throw error;
        }

        if (data && data.length > 0) {
            // Debug: Log all books before filtering
            console.log('📚 Library books before filter:', data.map(b => ({ id: b.id, title: b.title, file_url: b.file_url?.substring(0, 50) })));

            // Filter out books with null URLs (accept both http/https and relative paths)
            const validBooks = data.filter(book => book.file_url && (book.file_url.startsWith('http') || book.file_url.startsWith('/')));

            console.log('📚 Valid library books after filter:', validBooks.length);

            if (validBooks.length === 0) {
                // Show empty state if all were invalid
                const list = document.getElementById('library-list');
                if (list) {
                    list.innerHTML = `
                     <div class="text-center text-text-secondary text-sm py-8">
                         <i class="fas fa-book-open text-4xl mb-4 opacity-50"></i>
                         <p data-key="noBooksYet">No books uploaded yet. Upload a book above to get started!</p>
                     </div>`;
                }
                // STILL populate chat selector with official books
                populateChatBookContext([]);
                return;
            }

            libraryBooks = validBooks.map(book => ({
                id: book.id, // Include ID for RAG chat
                name: book.title,
                date: new Date(book.created_at).toLocaleDateString(),
                status: book.is_processed ? 'Ready' : 'Processing',
                color: book.is_processed ? 'sky' : 'amber',
                file_type: book.file_type || 'pdf',
                url: book.file_url, // Pass the URL to the renderer
                chunks_generated: book.chunks_generated || false
            }));
            renderLibrary();

            // Expose to window for language switch access (utils.js)
            window.libraryBooks = validBooks;

            // Populate chat book context selector for RAG
            populateChatBookContext(validBooks);
        } else {
            // Show empty state
            const list = document.getElementById('library-list');
            if (list) {
                list.innerHTML = `
                <div class="text-center text-text-secondary text-sm py-8">
                    <i class="fas fa-book-open text-4xl mb-4 opacity-50"></i>
                    <p data-key="noBooksYet">No books uploaded yet. Upload a book above to get started!</p>
                </div>`;
            }
            // Still populate chat selector with official resources (even if no library books)
            populateChatBookContext([]);
        }
    } catch (err) {
        console.error("Error fetching library:", err);
        // Try to populate chat selector anyway with official resources
        populateChatBookContext([]);
    }
}

// Populate chat book context selector for RAG
async function populateChatBookContext(libraryBooks) {
    const selector = document.getElementById('chat-book-context');
    if (!selector) return;

    // Get language for labels
    const lang = (typeof currentLang !== 'undefined') ? currentLang : 'en';
    const defaultLabel = lang === 'bn' ? 'সাধারণ চ্যাট (কোনো বই নেই)' : 'General Chat (No Book)';
    const libraryLabel = lang === 'bn' ? '📖 আমার বইসমূহ' : '📖 My Library';
    const officialLabel = lang === 'bn' ? '📚 অফিসিয়াল রিসোর্স' : '📚 Official Resources';

    selector.innerHTML = `<option value="">${defaultLabel}</option>`;

    // Add library books group
    if (libraryBooks && libraryBooks.length > 0) {
        const libraryGroup = document.createElement('optgroup');
        libraryGroup.label = libraryLabel;

        libraryBooks.forEach(book => {
            const option = document.createElement('option');
            option.value = book.id;
            option.dataset.sourceType = 'library';
            // Use Bangla title if available and language is Bangla
            const displayTitle = (lang === 'bn' && book.title_bn) ? book.title_bn : book.title;
            const ragReady = book.chunks_generated ? ' ✓' : ' ⏳';
            option.textContent = displayTitle + ragReady;
            libraryGroup.appendChild(option);
        });
        selector.appendChild(libraryGroup);
    }

    // Fetch and add official resources - filtered by class like library page
    try {
        if (window.supabaseClient) {
            // Get user's class and group (same logic as fetchOfficialResources.js)
            // Robust User Class Detection (Priority: LocalStorage -> User Metadata -> DB Profile -> Default)
            let userClass = localStorage.getItem('userClass');
            let userGroup = localStorage.getItem('userGroup') || 'Science';

            const { data: { user } } = await window.supabaseClient.auth.getUser();

            if (!userClass && user) {
                userClass = user.user_metadata?.class;
            }

            if (!userClass && user) {
                const { data: profile } = await window.supabaseClient
                    .from('profiles')
                    .select('class')
                    .eq('user_id', user.id)
                    .single();
                if (profile) userClass = profile.class;
            }

            if (!userClass) userClass = '10'; // Default

            // Determine target classes (e.g. "9" also matches "9-10")
            let targetClasses = [userClass];
            if (['9', '10'].includes(userClass)) targetClasses.push('9-10');
            else if (['11', '12'].includes(userClass)) targetClasses.push('11-12');
            if (userClass === 'University') targetClasses.push('University');

            const targetVersion = lang === 'bn' ? 'bangla' : 'english';

            const { data: officialBooks } = await window.supabaseClient
                .from('official_resources')
                .select('id, title, title_bn, subject, class_level')
                .in('class_level', targetClasses)
                .eq('version', targetVersion)
                .order('title', { ascending: true });

            // Filter by group (client-side like fetchOfficialResources)
            const filteredBooks = officialBooks ? officialBooks.filter(book => {
                const title = book.title.toLowerCase();
                const isCommon = title.includes('[common]') || !title.includes('[');
                const isUserGroup = title.toLowerCase().includes(`[${userGroup.toLowerCase()}]`);
                return isCommon || isUserGroup;
            }) : [];

            if (filteredBooks.length > 0) {
                const officialGroup = document.createElement('optgroup');

                // Convert class level to Bangla numerals
                const toBanglaNum = (str) => {
                    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
                    return String(str).replace(/[0-9]/g, d => banglaDigits[d]);
                };

                const classLabel = lang === 'bn' ? `শ্রেণি ${toBanglaNum(userClass)}` : `Class ${userClass}`;
                officialGroup.label = `${officialLabel} (${classLabel})`;

                filteredBooks.forEach(book => {
                    const option = document.createElement('option');
                    option.value = book.id;
                    option.dataset.sourceType = 'official';
                    // Use Bangla title if available and language is Bangla
                    const displayTitle = (lang === 'bn' && book.title_bn) ? book.title_bn : book.title;
                    const ragReady = ' ✓'; // Assume official books are processed
                    option.textContent = `${displayTitle}${ragReady}`;
                    officialGroup.appendChild(option);
                });
                selector.appendChild(officialGroup);
            }
        }
    } catch (err) {
        console.warn('Could not load official resources for chat:', err);
    }
}

async function fetchChatHistory() {
    if (!window.supabaseClient) return;

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;

        const { data, error } = await window.supabaseClient
            .from('chat_history')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(50);

        if (error) throw error;

        const chatContainer = document.getElementById('chat-messages');
        if (data && data.length > 0 && chatContainer) {
            // Clear default message if history exists, OR append? 
            // Better to keep default if empty.
            chatContainer.innerHTML = '';

            // Add default welcome message first
            chatContainer.innerHTML = `
                <div class="flex gap-3 group">
                    <div class="w-8 h-8 rounded-full bg-amber/20 border border-amber/50 flex items-center justify-center text-amber text-xs">
                        <i class="fas fa-robot group-hover:animate-bounce"></i>
                    </div>
                    <div class="bg-surface border border-divider text-text-primary p-3 rounded-2xl rounded-tl-none max-w-[85%] text-sm leading-relaxed shadow-sm transition-colors prose prose-invert prose-sm">
                        <span data-key="aiMsg1">Hello! I'm your AI Tutor. How can I help you learn today?</span>
                    </div>
                </div>
            `;

            data.forEach(msg => {
                const isUser = msg.role === 'user';
                const div = document.createElement('div');
                div.className = isUser ? "flex gap-3 flex-row-reverse group" : "flex gap-3 group";

                div.innerHTML = isUser ? `
                    <div class="w-8 h-8 rounded-full bg-midnight border border-divider flex items-center justify-center text-text-secondary text-xs">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="bg-amber text-black p-3 rounded-2xl rounded-tr-none max-w-[85%] text-sm leading-relaxed shadow-md transition-transform hover:scale-[1.01]">
                        ${marked.parse(msg.content)}
                    </div>
                ` : `
                    <div class="w-8 h-8 rounded-full bg-amber/20 border border-amber/50 flex items-center justify-center text-amber text-xs">
                        <i class="fas fa-robot group-hover:animate-bounce"></i>
                    </div>
                    <div class="bg-surface border border-divider text-text-primary p-3 rounded-2xl rounded-tl-none max-w-[85%] text-sm leading-relaxed shadow-sm transition-colors prose prose-invert prose-sm">
                        ${marked.parse(msg.content)}
                    </div>
                `;
                chatContainer.appendChild(div);
            });

            // Scroll to bottom
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    } catch (err) {
        console.error("Error fetching chat history:", err);
    }
}


function renderLibrary() {
    const list = document.getElementById('library-list');
    list.innerHTML = '';
    libraryBooks.forEach((book, index) => {
        const isReady = book.status === "Ready";
        const statusColor = isReady ? "text-emerald" : "text-amber";
        const icon = book.color === "rose" ? "fa-file-pdf" : "fa-file-alt";
        // Get book ID for RAG quiz queries
        const bookId = book.dbId || null;

        list.innerHTML += `
        <div class="bg-surface border border-divider rounded-xl p-4 flex items-center justify-between group hover:border-amber/50 transition-colors">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-lg bg-${book.color}/10 text-${book.color} flex items-center justify-center">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="min-w-0 flex-1">
                    <h4 class="text-text-primary font-bold text-sm truncate max-w-[180px] sm:max-w-[280px] md:max-w-[400px] lg:max-w-[500px]" title="${book.name}">${book.name}</h4>
                    <p class="text-text-secondary text-[10px] flex items-center gap-2">
                        <span>${book.date}</span>
                        <span class="${statusColor} font-bold">• ${book.status}</span>
                    </p>
                </div>
            </div>
            <button class="w-8 h-8 rounded-full ${isReady ? 'bg-amber text-black hover:scale-110 cursor-pointer shadow-amber-glow' : 'bg-divider text-text-secondary cursor-not-allowed'} flex items-center justify-center transition-transform" 
                onclick="${isReady ? `openQuizConfig('${book.name}', null, null, '${bookId}', 'library')` : ''}">
                <i class="fas fa-play text-xs"></i>
            </button>
        </div>`;
    });
}

// Helper: Detect file type from MIME type or extension
function getFileType(mimeType, fileName) {
    const mime = mimeType.toLowerCase();
    const ext = fileName.split('.').pop().toLowerCase();

    if (mime.includes('pdf') || ext === 'pdf') return 'pdf';
    if (mime.includes('epub') || ext === 'epub') return 'epub';
    if (mime.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return 'image';
    if (mime.includes('text') || ext === 'txt') return 'txt';
    return 'other';
}

document.getElementById('book-upload-input').addEventListener('change', async function (e) {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];

        // File size limit removed - progress bar handles large files
        // Supported: PDF, EPUB, TXT, Images (JPG, PNG, etc.)

        // Sanitize file name
        const timestamp = Date.now();
        const safeName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        // Show Loading State with Progress Bar
        const list = document.getElementById('library-list');
        if (list.querySelector('.text-center')) list.innerHTML = '';

        const tempId = 'temp-' + timestamp;
        const progressId = 'progress-' + timestamp;
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

        list.insertAdjacentHTML('afterbegin', `
            <div id="${tempId}" class="bg-surface border border-divider rounded-xl p-4 opacity-90">
                <div class="flex items-center gap-4 mb-3">
                    <div class="w-10 h-10 rounded-lg bg-amber/10 flex items-center justify-center">
                        <i class="fas fa-cloud-upload-alt text-amber animate-pulse"></i>
                    </div>
                    <div class="flex-1">
                        <h4 class="text-text-primary font-bold text-sm truncate">${file.name}</h4>
                        <p class="text-text-secondary text-xs">${sizeMB} MB</p>
                    </div>
                    <span id="${progressId}-text" class="text-amber font-bold text-sm">0%</span>
                </div>
                <div class="w-full bg-midnight rounded-full h-2 overflow-hidden">
                    <div id="${progressId}" class="bg-gradient-to-r from-amber to-yellow-400 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                </div>
            </div>
        `);

        try {
            console.log("Starting upload for:", file.name, "Size:", sizeMB, "MB");

            // OPTIMIZED: Single call instead of getUser + getSession
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (!session) throw new Error("User not logged in");

            const user = session.user;
            const accessToken = session.access_token;

            // Build Supabase Storage URL
            const SUPABASE_URL = window.supabaseClient.supabaseUrl;
            const bucketName = 'books';
            const filePath = `${user.id}/${safeName}`;
            const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucketName}/${filePath}`;

            // Use XMLHttpRequest for progress tracking
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    const progressBar = document.getElementById(progressId);
                    const progressText = document.getElementById(progressId + '-text');
                    if (progressBar) progressBar.style.width = percent + '%';
                    if (progressText) progressText.innerText = percent + '%';
                }
            });

            const uploadPromise = new Promise((resolve, reject) => {
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(JSON.parse(xhr.responseText || '{}'));
                    } else {
                        reject(new Error(xhr.responseText || 'Upload failed'));
                    }
                };
                xhr.onerror = () => reject(new Error('Network error'));
            });

            xhr.open('POST', uploadUrl, true);
            xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
            xhr.setRequestHeader('x-upsert', 'false');
            xhr.send(file);

            await uploadPromise;
            console.log("Upload successful via XHR");

            // 2. Get Public URL (local operation, no network)
            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('books')
                .getPublicUrl(`${user.id}/${safeName}`);

            console.log("Public URL generated:", publicUrl);

            // 3. Insert metadata into DB (get back the ID for chapter extraction)
            const { data: insertedBook, error: insertError } = await window.supabaseClient
                .from('library_books')
                .insert({
                    user_id: user.id,
                    title: file.name,
                    file_type: getFileType(file.type, file.name),
                    file_size_bytes: file.size,
                    file_url: publicUrl
                })
                .select()
                .single();

            if (insertError) {
                console.error("Database Insert Error:", insertError);
                throw insertError;
            }
            console.log("Database Insert Success, extracting chapters...");

            // 4. Auto-extract chapters from the PDF (background, don't block UI)
            fetch('/api/process-book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resourceId: insertedBook.id,
                    fileUrl: publicUrl,
                    sourceType: 'library'
                })
            }).then(async (response) => {
                const result = await response.json();
                if (result.success) {
                    console.log(`✅ Extracted ${result.chapters?.length || 0} chapters`);
                    // Update is_processed to true
                    await window.supabaseClient
                        .from('library_books')
                        .update({ is_processed: true })
                        .eq('id', insertedBook.id);
                } else {
                    console.warn('Chapter extraction warning:', result.error);
                }
            }).catch(err => {
                console.warn('Chapter extraction failed (non-blocking):', err);
            });

            // Success UI Update
            const tempEl = document.getElementById(tempId);
            if (tempEl) {
                tempEl.className = "bg-surface border border-divider rounded-xl p-4 flex items-center justify-between group hover:border-amber/50 transition-colors";
                tempEl.innerHTML = `
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-lg bg-sky/10 flex items-center justify-center">
                            <i class="fas fa-file-pdf text-sky"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <h4 class="text-text-primary font-bold text-sm truncate max-w-[180px] sm:max-w-[280px] md:max-w-[400px] lg:max-w-[500px]" title="${file.name}">${file.name}</h4>
                            <p class="text-text-secondary text-[10px] flex items-center gap-2">
                                <span>${new Date().toLocaleDateString()}</span>
                                <span class="text-emerald font-bold">• Ready</span>
                            </p>
                        </div>
                    </div>
                    <button class="w-8 h-8 rounded-full bg-amber text-black hover:scale-110 cursor-pointer shadow-amber-glow flex items-center justify-center transition-transform" 
                        onclick="window.open('${publicUrl}', '_blank')">
                        <i class="fas fa-play text-xs"></i>
                    </button>
                `;
            }

            // OPTIMIZED: Skip full library refresh - UI already updated above

        } catch (err) {
            console.error("Full Upload Process Failed:", err);
            const tempEl = document.getElementById(tempId);
            if (tempEl) {
                tempEl.className = "bg-surface border border-rose/30 rounded-xl p-4 flex items-center justify-between";
                tempEl.innerHTML = `
                   <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-lg bg-rose/10 flex items-center justify-center">
                            <i class="fas fa-exclamation-triangle text-rose"></i>
                        </div>
                        <div>
                            <h4 class="text-text-primary font-bold text-sm">Upload Failed</h4>
                            <p class="text-rose text-xs max-w-[200px] truncate">${err.message}</p>
                        </div>
                    </div>
                    <i class="fas fa-times text-text-secondary cursor-pointer hover:text-white" onclick="this.parentElement.remove()"></i>
                `;
            }
        }
    }
});

function updateProfileUI() {
    // Update XP
    document.getElementById('xp-display').innerText = (userMemory.total_xp || 0).toLocaleString();

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
    if (typeof updateUniversityUI === 'function') updateUniversityUI();
}

// Badge definitions with icons and colors (visual styling - fallback if DB doesn't have these)
let cachedBadgeDefinitions = null;

async function fetchBadgeDefinitions() {
    if (cachedBadgeDefinitions) return cachedBadgeDefinitions;

    try {
        const { data, error } = await window.supabaseClient
            .from('badge_definitions')
            .select('*');

        if (error) throw error;

        // Convert array to object keyed by id
        cachedBadgeDefinitions = {};
        for (const badge of data) {
            cachedBadgeDefinitions[badge.id] = {
                name: badge.name_en,
                nameBn: badge.name_bn,
                description: badge.description_en,
                descriptionBn: badge.description_bn
            };
        }
        console.log('✅ Badge definitions loaded from DB:', Object.keys(cachedBadgeDefinitions).length);
        return cachedBadgeDefinitions;
    } catch (err) {
        console.warn('Could not fetch badge definitions:', err);
        return {};
    }
}

// Visual styling for badges - Unique, professional colors matching badge themes
const BADGE_STYLES = {
    // 🎯 First Step - Green (new beginnings, growth, starting fresh)
    first_quiz: {
        icon: '🎯',
        name: 'First Step',
        nameBn: 'প্রথম পদক্ষেপ',
        gradient: 'from-emerald-400 to-green-500',
        borderColor: 'border-emerald-500/50',
        textColor: 'text-emerald-400'
    },
    // 🔥 3 Day Streak - Fire orange/red (heat, burning motivation)
    streak_3: {
        icon: '🔥',
        name: '3 Day Streak',
        nameBn: '৩ দিন স্ট্রিক',
        gradient: 'from-orange-400 to-red-500',
        borderColor: 'border-orange-500/50',
        textColor: 'text-orange-400'
    },
    // ⚔️ Week Warrior - Steel blue (strength, warrior spirit)
    streak_7: {
        icon: '⚔️',
        name: 'Week Warrior',
        nameBn: 'সাপ্তাহিক যোদ্ধা',
        gradient: 'from-slate-400 to-blue-500',
        borderColor: 'border-slate-500/50',
        textColor: 'text-slate-400'
    },
    // 👑 Monthly Master - Royal gold (royalty, mastery)
    streak_30: {
        icon: '👑',
        name: 'Monthly Master',
        nameBn: 'মাসিক মাস্টার',
        gradient: 'from-yellow-400 to-amber-500',
        borderColor: 'border-yellow-500/50',
        textColor: 'text-yellow-400'
    },
    // 💯 Perfect Score - Rose/pink (perfection, excellence)
    perfect_quiz: {
        icon: '💯',
        name: 'Perfect Score',
        nameBn: 'নিখুঁত স্কোর',
        gradient: 'from-rose-400 to-pink-500',
        borderColor: 'border-rose-500/50',
        textColor: 'text-rose-400'
    },
    // 🏆 Topic Master - Bronze/copper (trophy, achievement)
    topic_master: {
        icon: '🏆',
        name: 'Topic Master',
        nameBn: 'টপিক মাস্টার',
        gradient: 'from-amber-400 to-orange-500',
        borderColor: 'border-amber-500/50',
        textColor: 'text-amber-400'
    },
    // Quiz Count Badges - Blue progression (learning journey)
    quiz_10: {
        icon: '🔟',
        name: '10 Quizzes',
        nameBn: '১০ কুইজ',
        gradient: 'from-sky-400 to-blue-500',
        borderColor: 'border-sky-500/50',
        textColor: 'text-sky-400'
    },
    // 🏆 Quiz Expert - Deep purple (expertise, wisdom)
    quiz_50: {
        icon: '🏆',
        name: 'Quiz Expert',
        nameBn: 'কুইজ বিশেষজ্ঞ',
        gradient: 'from-violet-400 to-purple-500',
        borderColor: 'border-violet-500/50',
        textColor: 'text-violet-400'
    },
    // 👑 Quiz Legend - Royal purple/gold (legendary status)
    quiz_100: {
        icon: '👑',
        name: 'Quiz Legend',
        nameBn: 'কুইজ কিংবদন্তি',
        gradient: 'from-fuchsia-400 to-purple-500',
        borderColor: 'border-fuchsia-500/50',
        textColor: 'text-fuchsia-400'
    },
    // XP Badges - Electric/energy theme
    // ⚡ XP Hunter - Electric yellow (energy, lightning)
    xp_500: {
        icon: '⚡',
        name: 'XP Hunter',
        nameBn: 'এক্সপি শিকারী',
        gradient: 'from-yellow-300 to-amber-400',
        borderColor: 'border-yellow-400/50',
        textColor: 'text-yellow-400'
    },
    // 💎 XP Master - Diamond cyan/teal (precious, valuable)
    xp_2000: {
        icon: '💎',
        name: 'XP Master',
        nameBn: 'এক্সপি মাস্টার',
        gradient: 'from-cyan-400 to-teal-500',
        borderColor: 'border-cyan-500/50',
        textColor: 'text-cyan-400'
    },
    // 🌟 XP Legend - Warm gold/sunset (stardom, legendary)
    xp_5000: {
        icon: '🌟',
        name: 'XP Legend',
        nameBn: 'এক্সপি কিংবদন্তি',
        gradient: 'from-amber-300 to-yellow-400',
        borderColor: 'border-amber-400/50',
        textColor: 'text-amber-300'
    }
};

function renderBadge(badgeId) {
    // Get visual styling from code
    const style = BADGE_STYLES[badgeId] || {
        icon: '⭐',
        name: badgeId,
        nameBn: badgeId,
        gradient: 'from-gray-500 to-slate-600',
        borderColor: 'border-slate-500',
        textColor: 'text-slate-200'
    };

    // Get accent color for glow and check badge
    const accentColor = getColorFromGradient(style.gradient);

    // Override name with DB definition if available
    const dbDef = cachedBadgeDefinitions?.[badgeId];
    const displayName = currentLang === 'bn'
        ? (dbDef?.nameBn || style.nameBn)
        : (dbDef?.name || style.name);

    return `
        <div class="flex-shrink-0 group cursor-pointer badge-float">
            <!-- Glass Card Container -->
            <div class="relative w-28 h-36 rounded-2xl bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 p-3 flex flex-col items-center justify-between shadow-xl overflow-hidden group-hover:shadow-[0_0_30px_-5px_${accentColor}] transition-all duration-500">
                
                <!-- Shining Beam Effect -->
                <div class="absolute inset-0 bg-gradient-to-tr from-gray-400/0 dark:from-white/0 via-gray-400/5 dark:via-white/5 to-gray-400/0 dark:to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                
                <!-- Background Glow -->
                <div class="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-gradient-to-br ${style.gradient} opacity-20 blur-2xl rounded-full group-hover:opacity-30 transition-opacity"></div>
                
                <!-- Badge Icon Container -->
                <div class="relative z-10 mt-2">
                    <!-- Rotating Ring -->
                    <div class="absolute inset-[-4px] rounded-full border border-dashed opacity-0 group-hover:opacity-100 transition-opacity animate-spin-slow" style="border-color: ${accentColor}40;"></div>
                    
                    <!-- Icon Circle with solid background to block glow bleed -->
                    <div class="w-16 h-16 rounded-full bg-white dark:bg-[#1A1A1A] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <div class="w-14 h-14 rounded-full bg-gradient-to-b from-gray-50 to-gray-100 dark:from-[#2A2A2A] dark:to-[#1A1A1A] flex items-center justify-center">
                            <span class="text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] select-none">${style.icon}</span>
                        </div>
                    </div>
                    
                    <!-- Verified Check (uses accent color) -->
                    <div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-[0_2px_5px_rgba(0,0,0,0.3)] border-2 border-white dark:border-[#1A1A1A]" style="background: ${accentColor};">
                        <i class="fas fa-check text-white text-[10px]"></i>
                    </div>
                </div>

                <!-- Text Content -->
                <div class="z-10 text-center w-full mb-1">
                    <h4 class="text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white mb-0.5">
                        ${displayName}
                    </h4>
                    <div class="h-0.5 w-8 mx-auto rounded-full opacity-50 group-hover:w-16 group-hover:opacity-100 transition-all duration-300" style="background: linear-gradient(to right, ${accentColor}, ${accentColor}80);"></div>
                </div>
            </div>
        </div>
    `;
}

// Helper to extract a color for shadow from the gradient string (approximation)
function getColorFromGradient(gradientClass) {
    if (gradientClass.includes('emerald')) return '#10B981';
    if (gradientClass.includes('teal')) return '#14B8A6';
    if (gradientClass.includes('orange')) return '#F97316';
    if (gradientClass.includes('purple')) return '#8B5CF6';
    if (gradientClass.includes('amber')) return '#F59E0B';
    if (gradientClass.includes('yellow')) return '#EAB308';
    if (gradientClass.includes('pink')) return '#EC4899';
    if (gradientClass.includes('rose')) return '#F43F5E';
    if (gradientClass.includes('cyan')) return '#06B6D4';
    if (gradientClass.includes('blue')) return '#3B82F6';
    if (gradientClass.includes('indigo')) return '#6366F1';
    if (gradientClass.includes('sky')) return '#0EA5E9';
    if (gradientClass.includes('red')) return '#EF4444';
    return '#64748B';
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

    // Check if a book context is selected
    const bookContextSelect = document.getElementById('chat-book-context');
    const selectedBookId = bookContextSelect?.value || '';
    const isRagMode = selectedBookId && selectedBookId !== '';

    // Get book name for display
    let bookContextLabel = '';
    if (isRagMode) {
        const selectedOption = bookContextSelect.options[bookContextSelect.selectedIndex];
        bookContextLabel = `<div class="text-[10px] text-indigo-900 font-bold mt-1 border-t border-black/10 pt-1"><i class="fas fa-book"></i> ${selectedOption.text}</div>`;
    }

    chatContainer.innerHTML += `
        <div class="flex gap-3 flex-row-reverse animate-fade-in-up">
            <div class="w-8 h-8 rounded-full bg-divider flex items-center justify-center text-text-secondary text-xs">${(userProfile.nickname || userProfile.name || 'U')[0].toUpperCase()}</div>
            <div class="bg-amber text-black font-medium p-3 rounded-2xl rounded-tr-none max-w-[85%] text-sm shadow-amber-glow body-font">
                ${text || "Sent attachments"}
                ${attachmentHTML}
                ${bookContextLabel}
            </div>
        </div>`;

    input.value = '';
    input.style.height = 'auto'; // Reset height
    preview.innerHTML = '';
    preview.classList.add('hidden');
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const typingId = 'typing-' + Date.now();
    chatContainer.innerHTML += `
        <div id="${typingId}" class="flex gap-3 animate-fade-in-up">
            <div class="w-8 h-8 rounded-full bg-amber/20 border border-amber/50 flex items-center justify-center text-amber text-xs"><i class="fas fa-robot"></i></div>
            <div class="bg-surface border border-divider p-3 rounded-2xl rounded-tl-none text-text-secondary text-xs italic">
                ${isRagMode ? '<i class="fas fa-book-reader mr-1"></i>Reading book content...' : 'Thinking...'}
            </div>
        </div>`;
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        let memoryContext = "";
        if (userMemory.weaknesses.length > 0) {
            memoryContext = `\n[System Note: This student has struggled with the following topics in quizzes: ${userMemory.weaknesses.join(', ')}. If relevant to their question, explain these concepts simply and offer examples to help them improve.]`;
        }

        // Choose API endpoint based on context
        const apiEndpoint = isRagMode ? '/api/rag-chat' : '/api/chat';

        // Get source type from selected option's dataset
        const selectedOption = bookContextSelect?.options[bookContextSelect.selectedIndex];
        const sourceType = selectedOption?.dataset?.sourceType || 'library';

        // Get user's class/group for age-appropriate responses
        const currentUserClass = userProfile?.class || localStorage.getItem('userClass') || 'Unknown';
        const currentUserGroup = userProfile?.group || localStorage.getItem('userGroup') || 'Science';

        const requestBody = isRagMode
            ? {
                message: text,
                bookId: selectedBookId,
                sourceType: sourceType,
                history: { weaknesses: userMemory.weaknesses },
                userClass: currentUserClass,
                userGroup: currentUserGroup
            }
            : {
                message: text,
                history: { weaknesses: userMemory.weaknesses },
                userClass: currentUserClass,
                userGroup: currentUserGroup
            };

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Server Error ${response.status}`);
        }

        const data = await response.json();

        let aiText = data.reply;

        // Add source references if RAG was used
        if (data.usedBookContext && data.sources && data.sources.length > 0) {
            aiText += '\n\n---\n📚 **Sources from book:**\n';
            data.sources.forEach(src => {
                aiText += `- Source ${src.index}: "${src.text}" (${src.similarity}% match)\n`;
            });
        }

        document.getElementById(typingId).remove();
        appendAIMessage(aiText);

        // Save both messages to history
        saveChatMessage('user', text);
        saveChatMessage('assistant', aiText);

    } catch (error) {
        document.getElementById(typingId).remove();
        appendAIMessage(`⚠️ **System Error**: ${error.message}`);
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

// Generate educational diagram using AI
async function generateDiagram() {
    const input = document.getElementById('chat-input');
    const prompt = input.value.trim();

    if (!prompt) {
        alert('Please type what diagram you want (e.g., "Pythagorean theorem", "Cell structure")');
        return;
    }

    const chatContainer = document.getElementById('chat-messages');

    // Show user message
    chatContainer.innerHTML += `
        <div class="flex gap-3 flex-row-reverse animate-fade-in-up">
            <div class="w-8 h-8 rounded-full bg-divider flex items-center justify-center text-text-secondary text-xs">${(userProfile.nickname || userProfile.name || 'U')[0].toUpperCase()}</div>
            <div class="bg-amber text-black font-medium p-3 rounded-2xl rounded-tr-none max-w-[85%] text-sm shadow-amber-glow body-font">
                🎨 Generate diagram: ${prompt}
            </div>
        </div>`;

    input.value = '';

    // Show generating message
    const loadingId = 'img-loading-' + Date.now();
    chatContainer.innerHTML += `
        <div id="${loadingId}" class="flex gap-3 animate-fade-in-up">
            <div class="w-8 h-8 rounded-full bg-emerald/20 border border-emerald/50 flex items-center justify-center text-emerald text-xs"><i class="fas fa-wand-magic-sparkles"></i></div>
            <div class="bg-surface border border-divider p-3 rounded-2xl rounded-tl-none text-text-secondary text-xs italic">
                <i class="fas fa-spinner fa-spin mr-2"></i>Generating diagram... (this may take 10-30 seconds)
            </div>
        </div>`;
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Server Error ${response.status}`);
        }

        const data = await response.json();
        document.getElementById(loadingId).remove();

        // Show the generated image
        chatContainer.innerHTML += `
            <div class="flex gap-3 animate-fade-in-up">
                <div class="w-8 h-8 rounded-full bg-emerald/20 border border-emerald/50 flex items-center justify-center text-emerald text-xs"><i class="fas fa-wand-magic-sparkles"></i></div>
                <div class="bg-surface border border-divider p-3 rounded-2xl rounded-tl-none max-w-[85%]">
                    <p class="text-text-secondary text-xs mb-2">📊 Generated diagram for: "${prompt}"</p>
                    <img src="${data.image}" alt="${prompt}" class="rounded-lg max-w-full shadow-lg" />
                </div>
            </div>`;
        chatContainer.scrollTop = chatContainer.scrollHeight;

    } catch (error) {
        document.getElementById(loadingId).remove();
        appendAIMessage(`⚠️ **Image Generation Error**: ${error.message}`);
        console.error(error);
    }
}

// --- INIT ---
async function init() {
    document.getElementById('app-logo').src = 'Koushole_White.svg';
    await checkAuth(); // Check auth state on load
    updateUI(); // Force immediate UI update after auth check

    // Load Real Data (wait for these to complete)
    await fetchLibraryBooks();
    await fetchChatHistory();

    updateProfileUI(); // Load memory
    updateChapters(); // Init chapter list

    // Initialize Dynamic Chart
    initLearningChart();

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

// Dynamic Learning Chart
let learningChart = null;

async function initLearningChart() {
    // Destroy existing chart to prevent duplicates
    if (learningChart) {
        learningChart.destroy();
        learningChart = null;
    }

    const ctx = document.getElementById('growthChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(245, 158, 11, 0.5)');
    gradient.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

    // Fetch last 7 days of quiz data
    const chartData = await fetchQuizHistory();

    // Toggle welcome overlay based on data
    const welcomeOverlay = document.getElementById('new-user-welcome');
    if (chartData.hasData && welcomeOverlay) {
        welcomeOverlay.classList.add('hidden');
    } else if (welcomeOverlay) {
        welcomeOverlay.classList.remove('hidden');
    }

    if (window.learningChart instanceof Chart) {
        window.learningChart.destroy();
    }
    window.learningChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Quiz Score',
                data: chartData.scores,
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
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(156, 163, 175, 0.2)' },
                    ticks: {
                        color: '#9CA3AF',
                        callback: function (value) {
                            return typeof localNum === 'function' ? localNum(value) : value;
                        }
                    }
                },
                x: { grid: { display: false }, ticks: { color: '#9CA3AF' } }
            }
        }
    });
}

async function fetchQuizHistory() {
    // Day names in both languages
    const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNamesBn = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
    const dayNames = (typeof currentLang !== 'undefined' && currentLang === 'bn') ? dayNamesBn : dayNamesEn;

    const defaultLabels = (typeof currentLang !== 'undefined' && currentLang === 'bn')
        ? ['সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি', 'রবি']
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const defaultData = {
        labels: defaultLabels,
        scores: [0, 0, 0, 0, 0, 0, 0],
        hasData: false
    };

    if (!window.supabaseClient || !currentUserId) {
        return defaultData;
    }

    try {
        // Get last 7 days
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);

        const { data: attempts, error } = await window.supabaseClient
            .from('quiz_attempts')
            .select('score_percentage, created_at')
            .eq('user_id', currentUserId)
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error fetching quiz history:", error);
            return defaultData;
        }

        if (!attempts || attempts.length === 0) {
            return defaultData;
        }

        // Group by day and calculate average score
        const dailyScores = {};

        // Initialize last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const key = date.toISOString().split('T')[0];
            dailyScores[key] = { total: 0, count: 0, dayName: dayNames[date.getDay()] };
        }

        // Sum up scores per day
        attempts.forEach(attempt => {
            const dateKey = attempt.created_at.split('T')[0];
            if (dailyScores[dateKey]) {
                dailyScores[dateKey].total += attempt.score_percentage;
                dailyScores[dateKey].count++;
            }
        });

        // Convert to chart format
        const labels = [];
        const scores = [];
        Object.keys(dailyScores).sort().forEach(key => {
            labels.push(dailyScores[key].dayName);
            const avg = dailyScores[key].count > 0
                ? Math.round(dailyScores[key].total / dailyScores[key].count)
                : 0;
            scores.push(avg);
        });

        return { labels, scores, hasData: attempts.length > 0 };

    } catch (err) {
        console.error("fetchQuizHistory error:", err);
        return defaultData;
    }
}

// --- UI UPDATES (GLOBAL SCOPE) ---
function updateUI() {
    if (!isAuthenticated) return;

    // 1. Greeting
    updateGreeting();

    // 2. Streak (Header + Profile)
    const streakValue = userMemory.day_streak || 0;
    const streakText = `${localNum(streakValue)} ${currentLang === 'bn' ? 'দিন' : 'Days'} `;

    // Update all data-key="streak" elements
    document.querySelectorAll('[data-key="streak"]').forEach(el => el.innerText = streakText);

    // Also target by ID for header
    const headerStreak = document.getElementById('streak-text');
    if (headerStreak) headerStreak.innerText = streakText;

    // Profile page streak (just the number)
    const streakProfileEl = document.getElementById('streak-profile-display');
    if (streakProfileEl) streakProfileEl.innerText = localNum(streakValue);

    // 3. XP / Score
    const xpEl = document.getElementById('xp-display');
    if (xpEl) xpEl.innerText = localNum(userMemory.total_xp || 0);

    // 4. Accuracy
    const accEl = document.getElementById('accuracy-display');
    if (accEl) accEl.innerText = `${localNum(userMemory.accuracy_percentage || 0)}% `;

    // 5. Update Profile Info (with Bangla support - FULL NAME)
    // 5. Update Profile Info
    // Logic entirely moved to updateGreeting() to avoid duplication and bugs.


    // 6. Update Initials (based on NICKNAME, fallback to name)
    const nickForInitials = userProfile.nickname || userProfile.name || "S";
    const initials = nickForInitials.charAt(0).toUpperCase();
    document.querySelectorAll('#profile-initials').forEach(el => el.innerText = initials);
    const headerInitials = document.getElementById('header-profile-initials');
    if (headerInitials) headerInitials.innerText = initials;

    // Populate Personal Details Accordion
    const setTxt = (id, val) => { const e = document.getElementById(id); if (e) e.innerText = val || '-'; };
    setTxt('profile-fullname-en', userProfile.name);
    setTxt('profile-fullname-bn', userProfile.nameBn);
    setTxt('profile-nickname-en', userProfile.nickname);
    setTxt('profile-nickname-bn', userProfile.nicknameBn);
    setTxt('profile-email', userProfile.email || '-');

    // Translate class and group for Bangla display
    setTxt('profile-class', translateClass(userProfile.class));
    setTxt('profile-group', translateSubject(userProfile.group));

    // Dynamic Label for Group/Department
    const groupLabel = document.getElementById('profile-group-label');
    if (groupLabel) {
        const isUni = userProfile.class === 'University' || String(userProfile.class).includes('University') || String(userProfile.class).includes('বিশ্ববিদ্যালয়');
        if (isUni) {
            groupLabel.innerText = currentLang === 'bn' ? 'ডিপার্টমেন্ট' : 'Department';
        } else {
            // Default is Group, but strictly set it in case it was changed
            groupLabel.innerText = currentLang === 'bn' ? 'গ্রুপ' : 'Group';
        }
    }

    // Save for Quiz Config usage
    if (userProfile.group) localStorage.setItem('userGroup', userProfile.group);
    if (userProfile.class) localStorage.setItem('userClass', userProfile.class);

    // 7. Weakness Cloud
    const weaknessCloud = document.getElementById('weakness-cloud');
    if (weaknessCloud) {
        if (userMemory.weaknesses && userMemory.weaknesses.length > 0) {
            weaknessCloud.innerHTML = userMemory.weaknesses.map(w =>
                `<span class="px-2 py-1 rounded-full bg-rose/10 text-rose text-xs border border-rose/30">${w}</span>`
            ).join(' ');
        } else {
            weaknessCloud.innerHTML = `<span class="text-xs text-text-secondary italic">${t('noFocusAreas')}</span>`;
        }
    }

    // 8. Badges/Achievements
    const badgesContainer = document.getElementById('badges-container');
    if (badgesContainer) {
        if (userMemory.badges && userMemory.badges.length > 0) {
            badgesContainer.innerHTML = userMemory.badges.map(b => renderBadge(b)).join('');
        } else {
            badgesContainer.innerHTML = `<span class="text-xs text-text-secondary italic">${t('earnBadgesEmpty')}</span>`;
        }
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
        // if (continueSection) continueSection.classList.remove('hidden'); // Hidden until implemented

        if (hasWeaknesses && attentionSection) {
            attentionSection.classList.remove('hidden');
            // Populate weaknesses
            const container = document.getElementById('needs-attention-container');
            if (container) {
                container.innerHTML = userMemory.weaknesses.map(w => {
                    const displayName = typeof translateTopic === 'function' ? translateTopic(w) : w;
                    return `
                    <div class="group bg-surface rounded-xl p-4 border border-divider flex items-center justify-between transition-colors duration-300 hover:border-rose/30">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-lg bg-surface border border-rose/30 flex items-center justify-center text-rose transition-colors group-hover:bg-rose/10">
                                <i class="fas fa-exclamation group-hover:rotate-12 transition-transform"></i>
                            </div>
                            <div>
                                <h4 class="text-text-primary text-lg font-semibold title-font transition-colors">${displayName}</h4>
                                <p class="text-text-secondary text-xs body-font">${typeof t === 'function' ? t('accuracyLabel1') : 'Needs practice'}</p>
                            </div>
                        </div>
                        <button onclick="openQuizConfig(null, null, '${w}')"
                            class="px-4 py-2 rounded-full border border-amber text-amber text-xs font-bold hover:bg-amber hover:text-black transition-colors body-font">
                            ${typeof t === 'function' ? t('retryBtn') : 'Retry'}
                        </button>
                    </div>
                `;
                }).join('');
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

// --- UPDATE CHAPTERS FROM NCTB DATA ---
function updateChapters() {
    const subjectSelect = document.getElementById('quiz-subject');
    const chapterSelect = document.getElementById('quiz-chapter');

    if (!subjectSelect || !chapterSelect) return;

    // Clear existing
    subjectSelect.innerHTML = '';
    chapterSelect.innerHTML = '<option value="all" data-key="allChapters">All Chapters</option>';

    // Determine Group
    const group = (userProfile.group || 'Science').toLowerCase();

    // Combine group-specific subjects and common subjects
    let subjects = [];
    if (nctbCurriculum[group]) {
        subjects = [...nctbCurriculum[group], ...nctbCurriculum.common];
    } else {
        subjects = [...nctbCurriculum.science, ...nctbCurriculum.common];
    }

    // Populate Subjects
    subjects.forEach(sub => {
        const option = document.createElement('option');
        option.value = sub.id;
        option.innerText = currentLang === 'bn' ? sub.nameBn : sub.nameEn;
        subjectSelect.appendChild(option);
    });

    // Handle Change
    subjectSelect.onchange = () => {
        const selectedSubId = subjectSelect.value;
        const subData = subjects.find(s => s.id === selectedSubId);

        chapterSelect.innerHTML = '<option value="all" data-key="allChapters">All Chapters</option>'; // Reset

        if (subData && subData.chapters) {
            subData.chapters.forEach(chap => {
                const opt = document.createElement('option');
                opt.value = chap.id;
                opt.innerText = currentLang === 'bn' ? chap.bn : chap.en;
                chapterSelect.appendChild(opt);
            });
        }
    };

    // Trigger initial population
    subjectSelect.dispatchEvent(new Event('change'));
}


// --- NOTIFICATION SYSTEM ---

let cachedNotifications = [];

async function fetchNotifications() {
    if (!currentUserId) return;

    try {
        const { data, error } = await window.supabaseClient
            .from('notifications')
            .select('*')
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        cachedNotifications = data;

        const unreadCount = data.filter(n => !n.is_read).length;
        renderNotifications(data, unreadCount);

        // Also update profile view if open
        const profileContent = document.getElementById('profile-notifications-content');
        if (profileContent && !profileContent.classList.contains('hidden')) {
            renderProfileNotifications();
        }

    } catch (err) {
        console.error("Error fetching notifications:", err);
    }
}

function renderNotifications(notifications, unreadCount) {
    const listEl = document.getElementById('notification-list');
    const dotEl = document.getElementById('notification-dot');

    // Update red dot
    if (unreadCount > 0) {
        dotEl.classList.remove('hidden');
    } else {
        dotEl.classList.add('hidden');
    }

    if (!notifications || notifications.length === 0) {
        listEl.innerHTML = `
            <div class="flex flex-col items-center justify-center p-8 text-gray-500 gap-2">
                <i class="far fa-bell-slash text-2xl opacity-50"></i>
                <span class="text-xs italic">No new notifications</span>
            </div>`;
        return;
    }

    listEl.innerHTML = notifications.map(n => getNotificationHTML(n)).join('');
}

function getNotificationHTML(n) {
    let icon = 'fas fa-info-circle';
    let colorClass = 'text-blue-400';
    let bgClass = 'bg-blue-400/10';

    if (n.type === 'badge') {
        icon = 'fas fa-medal';
        colorClass = 'text-amber';
        bgClass = 'bg-amber/10';
    } else if (n.type === 'reminder') {
        icon = 'fas fa-clock';
        colorClass = 'text-purple-400';
        bgClass = 'bg-purple-400/10';
    }

    const exactTime = new Date(n.created_at).toLocaleString();
    const unreadStyle = !n.is_read ? 'bg-white/5 border-l-2 border-amber' : '';

    return `
        <div class="p-3 border-b border-white/5 hover:bg-white/5 transition-colors flex gap-3 ${unreadStyle}">
            <div class="w-8 h-8 rounded-full ${bgClass} ${colorClass} flex items-center justify-center shrink-0">
                <i class="${icon} text-xs"></i>
            </div>
            <div>
                <h5 class="text-xs font-bold text-gray-200 mb-0.5">${n.title}</h5>
                <p class="text-[10px] text-gray-400 leading-relaxed">${n.message}</p>
                <span class="text-[9px] text-gray-600 block mt-1">${exactTime}</span>
            </div>
        </div>
    `;
}

// function togglePersonalDetails() removed (duplicate)

function toggleProfileNotifications() {
    const content = document.getElementById('profile-notifications-content');
    const arrow = document.getElementById('profile-notifications-arrow');

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        arrow.style.transform = 'rotate(90deg)';
        renderProfileNotifications();
    } else {
        content.classList.add('hidden');
        arrow.style.transform = 'rotate(0deg)';
    }
}

function renderProfileNotifications() {
    const listEl = document.getElementById('profile-notifications-content');
    if (!cachedNotifications || cachedNotifications.length === 0) {
        listEl.innerHTML = '<div class="p-4 text-center text-text-secondary text-xs italic">No notifications</div>';
        return;
    }
    listEl.innerHTML = cachedNotifications.map(n => getNotificationHTML(n)).join('');
}

async function createNotification(type, title, message) {
    if (!currentUserId) return;
    try {
        await window.supabaseClient.from('notifications').insert({
            user_id: currentUserId,
            type,
            title,
            message
        });
        // Refresh list silently
        fetchNotifications();
    } catch (err) {
        console.error("Failed to create notification:", err);
    }
}

async function markAllNotificationsRead() {
    if (!currentUserId) return;
    try {
        await window.supabaseClient
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', currentUserId)
            .eq('is_read', false); // Only update unread ones

        // Refresh
        fetchNotifications();
    } catch (err) {
        console.error("Failed to mark read:", err);
    }
}


function toggleStreak() {
    const text = document.getElementById('streak-text');
    const bell = document.getElementById('notification-container');

    // Toggle Logic for Mobile (Desktop handles visibility via CSS sm:block)
    if (text.classList.contains('hidden')) {
        // Show text, Hide Bell
        text.classList.remove('hidden');
        bell.classList.add('hidden');
    } else {
        // Hide text, Show Bell
        text.classList.add('hidden');
        bell.classList.remove('hidden');
    }
}

function toggleNotifications() {
    const dropdown = document.getElementById('notification-dropdown');

    if (dropdown.style.display === 'none') {
        // Show
        dropdown.style.display = 'block';
        // Small delay to allow transition
        setTimeout(() => {
            dropdown.classList.remove('opacity-0', 'scale-95');
        }, 10);

        // Refresh data when opening
        fetchNotifications();
    } else {
        // Hide
        dropdown.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            dropdown.style.display = 'none';
        }, 200);
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const container = document.getElementById('notification-container');
    const dropdown = document.getElementById('notification-dropdown');
    if (container && !container.contains(e.target) && dropdown.style.display === 'block') {
        toggleNotifications();
    }
});

async function checkDailyReminder() {
    // 6 Hour Minimum Interval Check
    const lastCheck = localStorage.getItem('last_reminder_timestamp');
    const now = Date.now();
    const minInterval = 6 * 60 * 60 * 1000; // 6 hours

    if (lastCheck && (now - parseInt(lastCheck) < minInterval)) {
        return;
    }

    // Smart Enthusiastic Messages based on Performance
    let message = "Ready to unlock your potential? 🚀 The best time to study is NOW!";

    if (userMemory) {
        if (userMemory.day_streak > 3) {
            message = `🔥 incredible! Your ${userMemory.day_streak}-day streak is on fire! Don't let it cool down now!`;
        } else if (userMemory.accuracy_percentage > 0 && userMemory.accuracy_percentage < 60) {
            message = `💪 Mistakes are proof you are trying! Let's boost that ${userMemory.accuracy_percentage}% accuracy together!`;
        } else if (userMemory.total_xp > 1000) {
            message = `🏆 You're an XP Legend! Come back and break your own record!`;
        } else if (userMemory.last_quiz_date) {
            const daysSince = Math.floor((now - new Date(userMemory.last_quiz_date).getTime()) / (1000 * 60 * 60 * 24));
            if (daysSince > 1) {
                message = `👀 We miss you! It's been ${daysSince} days. Your brain is craving a challenge!`;
            }
        }
    }

    // Fallback variability
    if (message.includes("unlock")) {
        const alts = [
            "🧠 Curiosity is the engine of achievement. Fuel it now!",
            "⚡ It's been 6 hours... The perfect time to recharge your brain cells!",
            "🌟 Success is the sum of small efforts repeated daily. One quiz?",
            "📅 High time for high scores! Jump back in!"
        ];
        message = alts[Math.floor(Math.random() * alts.length)];
    }

    await createNotification('reminder', '⚡ Study Boost', message);

    localStorage.setItem('last_reminder_timestamp', now.toString());
}

// --- SIGNUP LOGIC ---
function setupSignupLogic() {
    const classSelect = document.getElementById('signup-class');
    const groupContainer = document.getElementById('group-container');
    const groupSelect = document.getElementById('signup-group');
    const deptContainer = document.getElementById('dept-container');
    const deptSelect = document.getElementById('signup-dept');
    const customDeptContainer = document.getElementById('custom-dept-container');
    const customDeptInput = document.getElementById('signup-custom-dept');

    if (!classSelect || !groupContainer || !deptContainer) return;

    // Class Change Handler
    classSelect.addEventListener('change', (e) => {
        if (e.target.value === 'University') {
            // Show Department, Hide Group
            groupContainer.classList.add('hidden');
            groupSelect.required = false;

            deptContainer.classList.remove('hidden');
            deptSelect.required = true;
        } else {
            // Show Group, Hide Department
            groupContainer.classList.remove('hidden');
            groupSelect.required = true;

            deptContainer.classList.add('hidden');
            deptSelect.required = false;

            // Also hide custom dept
            customDeptContainer.classList.add('hidden');
            customDeptInput.required = false;
        }
    });

    // Department Change Handler
    deptSelect.addEventListener('change', (e) => {
        if (e.target.value === 'Other') {
            customDeptContainer.classList.remove('hidden');
            customDeptInput.required = true;
        } else {
            customDeptContainer.classList.add('hidden');
            customDeptInput.required = false;
        }
    });
}

// --- CHAT UI LOGIC ---
function toggleChatTools() {
    const menu = document.getElementById('chat-tools-menu');
    const icon = document.getElementById('chat-tools-icon');

    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        icon.classList.add('rotate-45');
    } else {
        menu.classList.add('hidden');
        icon.classList.remove('rotate-45');
    }
}

function autoResizeChatInput(el) {
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight) + 'px';
}

// --- UNIVERSITY STUDENT HANDLING ---
function updateUniversityUI() {
    if (!userProfile || !userProfile.class) return;

    // Check against English and Bangla values
    const isUniversity = userProfile.class === 'University' || userProfile.class === 'বিশ্ববিদ্যালয়';
    const uniMsg = document.getElementById('university-quiz-message');
    const quizEmpty = document.getElementById('quiz-empty-state');
    const quizLoading = document.getElementById('quiz-loading');
    const quizContent = document.getElementById('quiz-content');
    const newUserWelcome = document.getElementById('new-user-welcome');

    if (isUniversity) {
        // Dashboard: Hide "Start First Quiz" overlay
        if (newUserWelcome) newUserWelcome.classList.add('hidden');

        // Quiz Tab: Show Uni Message, Ensure others hidden
        if (uniMsg) uniMsg.classList.remove('hidden');
        if (quizEmpty) quizEmpty.classList.add('hidden');
        // Force hide active quiz elements too (since Uni shouldn't use default quiz)
        if (quizLoading) quizLoading.classList.add('hidden');
        if (quizContent) quizContent.classList.add('hidden');
    } else {
        // Restore default state capability
        if (uniMsg) uniMsg.classList.add('hidden');
        // We do not auto-show others because their state depends on other logic.
    }
}

// Override switchTab to enforce University UI
// This ensures that even if tabs switch, we re-apply the correct visibility
const originalSwitchTab = window.switchTab;
window.switchTab = function (viewName) {
    // Call original function first (from utils.js)
    // Note: utils.js defines switchTab globally.
    if (typeof originalSwitchTab === 'function') {
        originalSwitchTab(viewName);
    } else if (typeof switchTab === 'function' && switchTab !== window.switchTab) {
        // Fallback if originalSwitchTab wasn't captured correctly but exists
        // (Unlikely if captured at top level)
    }

    // Apply University constraints
    if (viewName === 'quiz' || viewName === 'dashboard') {
        updateUniversityUI();
    }
};
