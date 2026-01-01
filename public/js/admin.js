
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

    const FALLBACK_SUBJECTS_9_10 = {
        'Common': ['Bangla 1st Paper', 'Bangla 2nd Paper', 'English 1st Paper', 'English 2nd Paper', 'ICT', 'Religion (Islam)', 'Religion (Hindu)', 'Career Education', 'Physical Education', 'Arts & Crafts'],
        'Science': ['Physics', 'Chemistry', 'Higher Math', 'Biology', 'Agriculture Studies', 'Bangladesh & Global Studies'],
        'Commerce': ['Accounting', 'Finance & Banking', 'Business Org & Mgt', 'Marketing', 'Production Mgt', 'Statistics', 'Science (General)'],
        'Humanities': ['Economics', 'Civics & Good Governance', 'History', 'Geography', 'Sociology', 'Science (General)']
    };

    const FALLBACK_SUBJECTS_11_12 = {
        'Common': ['Bangla 1st Paper', 'Bangla 2nd Paper', 'English 1st Paper', 'English 2nd Paper', 'ICT'],
        'Science': ['Physics 1st Paper', 'Physics 2nd Paper', 'Chemistry 1st Paper', 'Chemistry 2nd Paper', 'Higher Math 1st Paper', 'Higher Math 2nd Paper', 'Biology 1st Paper', 'Biology 2nd Paper'],
        'Commerce': ['Accounting 1st Paper', 'Accounting 2nd Paper', 'Finance, Banking & Ins 1st Paper', 'Finance, Banking & Ins 2nd Paper', 'Business Org & Mgt 1st Paper', 'Business Org & Mgt 2nd Paper', 'Marketing 1st Paper', 'Marketing 2nd Paper'],
        'Humanities': ['Economics 1st Paper', 'Economics 2nd Paper', 'Geography 1st Paper', 'Geography 2nd Paper', 'History 1st Paper', 'History 2nd Paper', 'Civics & Good Governance 1st Paper', 'Civics & Good Governance 2nd Paper', 'Sociology 1st Paper', 'Sociology 2nd Paper', 'Social Work 1st Paper', 'Social Work 2nd Paper']
    };

    function getSubjectsFallback(group, className) {
        const isHSC = ['11', '12', '11-12'].includes(String(className));
        const data = isHSC ? FALLBACK_SUBJECTS_11_12 : FALLBACK_SUBJECTS_9_10;
        let list = [...(data['Common'] || [])];
        if (group && data[group]) list = [...list, ...data[group]];
        return [...new Set(list)];
    }

    // -------------------------------------------------------------------
    // SUBJECT LOADING LOGIC (RUNS IMMEDIATELY)
    // -------------------------------------------------------------------
    function updateSubjects() {
        const group = groupSelect ? groupSelect.value : 'Science';
        const className = classSelect ? classSelect.value : '9';

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
    if (classSelect) classSelect.addEventListener('change', updateSubjects);

    updateSubjects();

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
    // UPLOAD LOGIC WITH PROGRESS BAR
    // -------------------------------------------------------------------
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

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

        // Construct Title
        let finalTitle = `${subject} - Class ${classLevel}`;
        if (group !== 'Common') finalTitle += ` [${group}]`;
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
            const SUPABASE_URL = window.supabaseClient.supabaseUrl || 'https://mocbdqgvsunbxmrnllbr.supabase.co';
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
            const { error: dbError } = await window.supabaseClient
                .from('official_resources')
                .insert({
                    title: finalTitle,
                    subject: subject,
                    class_level: classLevel,
                    file_url: publicUrl,
                    cover_url: null,
                    uploaded_by: userEmail
                });

            if (dbError) throw dbError;

            showStatus('✅ Upload Successful! Book is now live.', 'text-green-500 font-bold');
            form.reset();
            setTimeout(updateSubjects, 100);

        } catch (error) {
            console.error('❌ Upload failed:', error);
            showStatus(`❌ Error: ${error.message}`, 'text-red-500');
        } finally {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    });

    function showStatus(msg, classes) {
        statusMsg.innerHTML = `<p class="${classes}">${msg}</p>`;
    }
});
