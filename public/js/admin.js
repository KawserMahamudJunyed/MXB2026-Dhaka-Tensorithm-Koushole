
document.addEventListener('DOMContentLoaded', async () => {
    // -------------------------------------------------------------------
    // SECURITY CONFIG
    // -------------------------------------------------------------------
    // Replace this with your specific email to prevent unauthorized uploads
    // even if someone clones the repo.
    const ALLOWED_ADMINS = ['YOUR_EMAIL@example.com', 'admin@koushole.com'];

    // Check if user is logged in
    const session = await window.supabaseClient.auth.getSession();
    if (!session.data.session) {
        alert("You must be logged in to access this page.");
        window.location.href = '/';
        return;
    }

    const userEmail = session.data.session.user.email;
    console.log("Logged in as:", userEmail);

    // Strict Admin Check (Client-Side)
    // Note: RLS (Database Policy) is the real security, but this UI check prevents accidental misuse.
    // Uncomment the block below to enable strict email checking!
    /*
    if (!ALLOWED_ADMINS.includes(userEmail)) {
        document.body.innerHTML = `
            <div style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;color:white;background:#0a0a0a;">
                <h1 style="color:red;font-size:2rem;">🚫 Access Denied</h1>
                <p>You are not authorized to upload official resources.</p>
                <p>User: ${userEmail}</p>
                <a href="/" style="color:#F59E0B;margin-top:20px;">Return Home</a>
            </div>
        `;
        return;
    }
    */

    const form = document.getElementById('upload-form');
    const statusMsg = document.getElementById('status-msg');
    const submitBtn = document.getElementById('submit-btn');
    const groupSelect = document.getElementById('group');
    const classSelect = document.getElementById('class-level');
    const subjectSelect = document.getElementById('subject');

    // -------------------------------------------------------------------
    // SUBJECT LOADING LOGIC (DEBUGGED)
    // -------------------------------------------------------------------
    function updateSubjects() {
        // Safe access to values
        const group = groupSelect ? groupSelect.value : 'Science';
        const className = classSelect ? classSelect.value : '9';

        console.log(`🔄 Updating Subjects for Group: ${group}, Class: ${className}`);

        let subjects = [];

        // Method 1: Try Global Helper (Preferred)
        if (window.getSubjects) {
            subjects = window.getSubjects(group, className);
        }
        // Method 2: Fallback to Direct Map (Legacy/Debug)
        else if (window.subjectsByGroup) {
            console.warn("⚠️ window.getSubjects missing, falling back to simple mapping");
            subjects = window.subjectsByGroup[group] || [];
        }
        // Method 3: Emergency Fallback
        else {
            console.error("❌ No subject data found (subjects.js likely not loaded)");
            subjectSelect.innerHTML = '<option value="">Error: Subjects not loaded</option>';
            return;
        }

        console.log(`✅ Found ${subjects.length} subjects`); // Debug log

        if (subjects.length === 0) {
            subjectSelect.innerHTML = '<option value="">No subjects available</option>';
        } else {
            subjectSelect.innerHTML = subjects.map(sub => `<option value="${sub}">${sub}</option>`).join('');
        }
    }

    // Attach Listeners
    if (groupSelect) groupSelect.addEventListener('change', updateSubjects);
    if (classSelect) classSelect.addEventListener('change', updateSubjects); // Crucial for Class 11-12 switch

    // Initial Load - Delay slightly to ensure subjects.js parses
    setTimeout(updateSubjects, 100);

    // -------------------------------------------------------------------
    // UPLOAD LOGIC
    // -------------------------------------------------------------------
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        statusMsg.innerText = 'Uploading...';
        statusMsg.className = 'text-center text-sm text-yellow-500 animate-pulse';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';

        const version = document.getElementById('version').value;
        const group = document.getElementById('group').value;
        const subject = document.getElementById('subject').value;
        const classLevel = document.getElementById('class-level').value;
        const fileInput = document.getElementById('file');
        const file = fileInput.files[0];

        // Construct Title automatically
        let finalTitle = `${subject} - Class ${classLevel}`;
        if (group !== 'Common') {
            finalTitle += ` [${group}]`;
        }

        if (version === 'English') {
            finalTitle += ' (English Version)';
        } else {
            finalTitle += ' (Bangla Medium)';
        }

        if (!file) {
            showStatus('Please select a PDF file.', 'text-red-500');
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            return;
        }

        try {
            // 1. Upload File to Storage
            const fileExt = file.name.split('.').pop();
            // Sanitize filename to avoid weird character issues
            const safeSubject = subject.replace(/[^a-zA-Z0-9]/g, '');
            const fileName = `${classLevel}_${safeSubject}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            console.log("📤 Uploading file to storage:", filePath);

            const { data: uploadData, error: uploadError } = await window.supabaseClient
                .storage
                .from('official-books')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = window.supabaseClient
                .storage
                .from('official-books')
                .getPublicUrl(filePath);

            // 3. Insert into Database
            console.log("💾 Saving metadata to DB:", finalTitle);
            const { error: dbError } = await window.supabaseClient
                .from('official_resources')
                .insert({
                    title: finalTitle,
                    subject: subject,
                    class_level: classLevel,
                    file_url: publicUrl,
                    cover_url: null,
                    uploaded_by: userEmail // Track who uploaded it
                });

            if (dbError) throw dbError;

            showStatus('✅ Upload Successful!', 'text-green-500 font-bold');
            form.reset();
            // Reset subjects after reset
            setTimeout(updateSubjects, 100);

        } catch (error) {
            console.error('Upload failed:', error);
            showStatus(`❌ Error: ${error.message}`, 'text-red-500');
        } finally {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    });

    function showStatus(msg, classes) {
        statusMsg.innerText = msg;
        statusMsg.className = `text-center text-sm ${classes}`;
    }
});
