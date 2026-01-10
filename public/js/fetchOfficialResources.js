

async function fetchOfficialResources() {
    if (!window.supabaseClient) return;

    console.log("📚 Fetching Official Resources...");
    const container = document.getElementById('official-books-list');
    if (!container) return;

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();

        // 1. Get User Class (Priority: LocalStorage -> User Metadata -> DB Profile -> Default)
        let userClass = localStorage.getItem('userClass');

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

        if (!userClass) {
            console.warn("⚠️ User class not found, defaulting to '10'");
            userClass = '10';
        }

        // 2. Get User Group (Priority: LocalStorage -> Default)
        let userGroup = localStorage.getItem('userGroup') || 'Science';

        console.log(`👤 User Class: ${userClass}, Group: ${userGroup}`);

        // 3. Determine Target Classes
        let targetClasses = [userClass];

        if (['9', '10'].includes(userClass)) {
            targetClasses.push('9-10');
        } else if (['11', '12'].includes(userClass)) {
            targetClasses.push('11-12');
        }

        if (userClass === 'University') targetClasses.push('University');

        console.log(`🎯 Querying books for classes: ${JSON.stringify(targetClasses)}, group: ${userGroup}`);

        // 4. Determine Language Version
        // currentLang is global from utils.js ('en' or 'bn')
        const targetVersion = (typeof currentLang !== 'undefined' && currentLang === 'bn') ? 'bangla' : 'english';
        console.log(`🗣️ Language: ${targetVersion} (${currentLang})`);

        // 5. Execute Query - Get all books for these classes AND language
        const { data, error } = await window.supabaseClient
            .from('official_resources')
            .select('*')
            .in('class_level', targetClasses)
            .eq('version', targetVersion)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 5. Filter by Group (client-side since title contains group info)
        // Show Common books AND user's group books
        const filteredData = data ? data.filter(book => {
            const title = book.title.toLowerCase();
            const isCommon = title.includes('[common]') || !title.includes('[');
            const isUserGroup = title.toLowerCase().includes(`[${userGroup.toLowerCase()}]`);
            return isCommon || isUserGroup;
        }) : [];

        console.log(`✅ Found ${filteredData.length} books (filtered from ${data?.length || 0} total).`);

        // 6. Render
        if (filteredData.length > 0) {
            container.innerHTML = filteredData.map(book => `
                <div class="flex items-center gap-4 bg-surface p-3 rounded-xl border border-divider hover:border-amber/50 transition-colors group cursor-pointer" onclick="window.open('${book.file_url}', '_blank')">
                    <div class="w-10 h-10 rounded-lg bg-amber/10 flex items-center justify-center text-amber text-lg shrink-0 group-hover:scale-110 transition-transform">
                        <i class="fas fa-book"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="text-text-primary font-bold text-sm truncate max-w-[180px] sm:max-w-[280px] md:max-w-[400px]" title="${book.title}">${book.title}</h4>
                        <p class="text-text-secondary text-xs truncate">${book.subject} • Class ${book.class_level}</p>
                    </div>
                    <div class="w-8 h-8 rounded-full bg-surface border border-divider flex items-center justify-center text-text-secondary group-hover:text-amber group-hover:border-amber transition-all">
                        <i class="fas fa-external-link-alt text-xs"></i>
                    </div>
                </div>
            `).join('');
        } else {
            // Use translation if available
            const emptyMsg = (typeof t === 'function') ? t('noBooksFound') : 'No official books found for your class.';
            container.innerHTML = `
                <div class="text-center text-text-secondary text-xs py-4 opacity-50">
                    ${emptyMsg}
                </div>`;
        }
    } catch (err) {
        console.error("❌ Error fetching official resources:", err);
        const errorMsg = (typeof t === 'function') ? t('loadResourcesError') : 'Failed to load resources';
        container.innerHTML = `<div class="text-center text-rose text-xs py-4">${errorMsg}</div>`;
    }
}
