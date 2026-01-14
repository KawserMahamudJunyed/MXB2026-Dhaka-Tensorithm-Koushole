
document.addEventListener('DOMContentLoaded', async () => {

    // -------------------------------------------------------------------
    // UI ELEMENTS & FALLBACK DATA
    // -------------------------------------------------------------------
    const form = document.getElementById('upload-form');
    const statusMsg = document.getElementById('status-msg');
    const submitBtn = document.getElementById('submit-btn');
    const groupSelect = document.getElementById('group');
    const classSelect = document.getElementById('class-level');
    const subjectSelect = document.getElementById('subject');

    // NCTB 2026 Fallback Data
    // Class 6-8: No groups needed - detected by class value
    const FALLBACK_SUBJECTS_6_8 = ['Bangla 1st Paper', 'Bangla 2nd Paper', 'English 1st Paper', 'English 2nd Paper', 'Mathematics', 'Science', 'Bangladesh & Global Studies', 'Religion & Moral Education (Islam)', 'ICT', 'Work & Life Skills', 'Arts & Culture', 'Health & Physical Education'];

    const FALLBACK_SUBJECTS_9_10 = {
        'Common': ['Bangla 1st Paper', 'Bangla 2nd Paper', 'English 1st Paper', 'English 2nd Paper', 'Mathematics', 'ICT'],
        'Science': ['Physics', 'Chemistry', 'Biology', 'Higher Mathematics', 'Bangladesh & Global Studies'],
        'Business Studies': ['General Science', 'Accounting', 'Finance & Banking', 'Business Entrepreneurship'],
        'Humanities': ['General Science', 'Geography & Environment', 'History of BD & World', 'Civics & Citizenship']
    };

    const FALLBACK_SUBJECTS_11_12 = {
        'Common': ['ICT'],
        'Science': ['Higher Mathematics 1st Paper', 'Higher Mathematics 2nd Paper', 'Physics 1st Paper', 'Physics 2nd Paper', 'Chemistry 1st Paper', 'Chemistry 2nd Paper', 'Biology 1st Paper', 'Biology 2nd Paper'],
        'Business Studies': ['Accounting 1st Paper', 'Accounting 2nd Paper', 'Management 1st Paper', 'Management 2nd Paper', 'Finance 1st Paper', 'Finance 2nd Paper'],
        'Humanities': ['Economics 1st Paper', 'Economics 2nd Paper', 'Civics 1st Paper', 'Civics 2nd Paper']
    };

    function getSubjectsFallback(group, className) {
        const classStr = String(className);
        const isJunior = ['6', '7', '8'].includes(classStr);
        const isHSC = ['11', '12', '11-12'].includes(classStr);

        // Class 6-8: No groups, return directly
        if (isJunior) {
            return FALLBACK_SUBJECTS_6_8;
        }

        const data = isHSC ? FALLBACK_SUBJECTS_11_12 : FALLBACK_SUBJECTS_9_10;
        let list = [...(data['Common'] || [])];
        if (group && group !== 'None' && data[group]) list = [...list, ...data[group]];
        return [...new Set(list)];
    }

    // -------------------------------------------------------------------
    // SUBJECT LOADING LOGIC (RUNS IMMEDIATELY)
    // -------------------------------------------------------------------
    const groupContainer = document.getElementById('group-container');

    function updateGroupVisibility() {
        const classValue = classSelect ? classSelect.value : '';
        const isJunior = ['6', '7', '8'].includes(classValue);

        if (groupContainer) {
            if (isJunior) {
                groupContainer.classList.add('hidden');
                if (groupSelect) groupSelect.value = 'Common'; // Reset to Common for juniors
            } else {
                groupContainer.classList.remove('hidden');
            }
        }
    }

    function updateSubjects() {
        const group = groupSelect ? groupSelect.value : 'Common';
        const className = classSelect ? classSelect.value : '9-10';

        console.log(`🔄 Updating Subjects for Group: ${group}, Class: ${className}`);

        let subjects = [];

        if (window.getSubjects) {
            subjects = window.getSubjects(group, className);
        } else {
            console.warn("⚠️ window.getSubjects missing, using local fallback");
            subjects = getSubjectsFallback(group, className);
        }

        if (subjects.length === 0) {
            subjectSelect.innerHTML = '<option value="">No subjects available</option>';
        } else {
            subjectSelect.innerHTML = subjects.map(sub => `<option value="${sub}">${sub}</option>`).join('');
        }
    }

    if (groupSelect) groupSelect.addEventListener('change', updateSubjects);
    if (classSelect) {
        classSelect.addEventListener('change', () => {
            updateGroupVisibility();
            updateSubjects();
        });
    }

    updateGroupVisibility();
    updateSubjects();

    // -------------------------------------------------------------------
    // PREVENT FORM SUBMISSION UNTIL READY (FIXES RACE CONDITION)
    // -------------------------------------------------------------------
    let isReady = false;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Checking access...';

    // Attach submit handler IMMEDIATELY to prevent page refresh
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!isReady) {
            showStatus('⏳ Please wait, loading...', 'text-yellow-500');
            return;
        }

        // Upload logic continues below after auth check passes
        handleUpload(e);
    });

    // -------------------------------------------------------------------
    // WAIT FOR SUPABASE CLIENT (prevents hanging)
    // -------------------------------------------------------------------
    const waitForSupabase = (maxWait = 5000) => {
        return new Promise((resolve) => {
            const start = Date.now();
            const check = () => {
                if (window.supabaseClient) {
                    resolve(true);
                } else if (Date.now() - start > maxWait) {
                    resolve(false);
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    };

    const supabaseReady = await waitForSupabase();
    if (!supabaseReady) {
        alert("Failed to initialize. Please refresh the page.");
        submitBtn.textContent = 'Error - Refresh Page';
        return;
    }

    // -------------------------------------------------------------------
    // AUTHENTICATION CHECK
    // -------------------------------------------------------------------
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) {
        alert("You must be logged in to access this page.");
        window.location.href = '/';
        return;
    }

    const userEmail = session.user.email;
    const accessToken = session.access_token;
    console.log("✅ Logged in as:", userEmail);

    // -------------------------------------------------------------------
    // ADMIN EMAIL RESTRICTION
    // -------------------------------------------------------------------
    const ALLOWED_ADMINS = [
        'admin@koushole.app',
        'kawsermahamudjunyed@gmail.com' // Backup admin
    ];

    if (!ALLOWED_ADMINS.includes(userEmail.toLowerCase())) {
        document.body.innerHTML = `
            <div style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;color:white;background:#0a0a0a;font-family:Outfit,sans-serif;">
                <div style="font-size:80px;margin-bottom:20px;">🚫</div>
                <h1 style="color:#EF4444;font-size:2rem;margin-bottom:10px;">Access Denied</h1>
                <p style="color:#9CA3AF;margin-bottom:10px;">You are not authorized to upload official resources.</p>
                <p style="color:#6B7280;font-size:0.8rem;">Logged in as: ${userEmail}</p>
                <a href="/" style="color:#F59E0B;margin-top:30px;text-decoration:none;">← Return Home</a>
            </div>
        `;
        return;
    }

    console.log("🔐 Admin access verified for:", userEmail);

    // Enable upload now that auth is complete
    isReady = true;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Upload Book';

    // -------------------------------------------------------------------
    // UPLOAD LOGIC WITH PROGRESS BAR
    // -------------------------------------------------------------------
    async function handleUpload(e) {
        const version = document.getElementById('version').value;
        const group = document.getElementById('group').value;
        const subject = document.getElementById('subject').value;
        const classLevel = document.getElementById('class-level').value;
        const fileInput = document.getElementById('file');
        const file = fileInput.files[0];

        if (!file) {
            showStatus('❌ Please select a PDF file.', 'text-red-500');
            return;
        }

        // Get book part selection
        const bookPart = document.getElementById('book-part').value;

        // Construct Title
        let finalTitle = `${subject} - Class ${classLevel}`;
        // Only add group tag for Class 9-12 with actual groups (not None or Common)
        if (group && group !== 'None' && group !== 'Common') {
            finalTitle += ` [${group}]`;
        }
        // Add part info if not full book
        if (bookPart && bookPart !== 'Full') {
            finalTitle += ` - ${bookPart}`;
        }
        finalTitle += (version === 'English') ? ' (English Version)' : ' (Bangla Medium)';

        // Show Progress Bar UI
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        statusMsg.innerHTML = `
            <div class="space-y-2">
                <p class="text-yellow-500 animate-pulse">📤 Uploading ${sizeMB} MB...</p>
                <div class="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div id="admin-progress" class="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-300" style="width: 0%"></div>
                </div>
                <p id="admin-progress-text" class="text-xs text-gray-400">0%</p>
            </div>
        `;
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';

        try {
            const fileExt = file.name.split('.').pop();
            const safeSubject = subject.replace(/[^a-zA-Z0-9]/g, '');
            const fileName = `${classLevel}_${safeSubject}_${Date.now()}.${fileExt}`;

            // Build Upload URL
            const SUPABASE_URL = window.supabaseClient.supabaseUrl;
            const uploadUrl = `${SUPABASE_URL}/storage/v1/object/official-books/${fileName}`;

            console.log("📤 Uploading to:", uploadUrl);

            // XHR with Progress
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    const bar = document.getElementById('admin-progress');
                    const text = document.getElementById('admin-progress-text');
                    if (bar) bar.style.width = percent + '%';
                    if (text) text.innerText = percent + '%';
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
            console.log("✅ Upload successful");

            // Get Public URL
            const { data: { publicUrl } } = window.supabaseClient
                .storage
                .from('official-books')
                .getPublicUrl(fileName);

            console.log("🔗 Public URL:", publicUrl);

            // Insert to Database
            const { data: insertedBook, error: dbError } = await window.supabaseClient
                .from('official_resources')
                .insert({
                    title: finalTitle,
                    subject: subject,
                    class_level: classLevel,
                    file_url: publicUrl,
                    cover_url: null,
                    uploaded_by: userEmail,
                    version: version.toLowerCase()
                })
                .select()
                .single();

            if (dbError) throw dbError;

            showStatus('✅ Upload Successful! Processing book in background...', 'text-green-500');

            // Auto-extract chapters from the PDF (non-blocking with timeout)
            // Using setTimeout to not block the success message
            setTimeout(async () => {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55 sec timeout (Vercel max is 60s)

                    const processResponse = await fetch('/api/process-book', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            resourceId: insertedBook.id,
                            fileUrl: publicUrl,
                            sourceType: 'official'
                        }),
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    const processResult = await processResponse.json();

                    if (processResult.success) {
                        console.log(`✅ ${processResult.chapters?.length || 0} chapters extracted.`);
                    } else {
                        console.warn('Chapter extraction warning:', processResult.error);
                    }
                } catch (processError) {
                    if (processError.name === 'AbortError') {
                        console.log('⏱️ Processing timed out - will continue in background');
                    } else {
                        console.warn('Chapter extraction failed:', processError);
                    }
                }
            }, 100);

            form.reset();
            setTimeout(updateSubjects, 100);

        } catch (error) {
            console.error('❌ Upload failed:', error);
            showStatus(`❌ Error: ${error.message}`, 'text-red-500');
        } finally {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    }

    function showStatus(msg, classes) {
        statusMsg.innerHTML = `<p class="${classes}">${msg}</p>`;
    }
});
