

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
            // Subject translations for Bangla
            const subjectTranslations = {
                'Mathematics': 'গণিত',
                'General Mathematics': 'গণিত',
                'Higher Mathematics': 'উচ্চতর গণিত',
                'Physics': 'পদার্থবিজ্ঞান',
                'Chemistry': 'রসায়ন',
                'Biology': 'জীববিজ্ঞান',
                'Science': 'বিজ্ঞান',
                'General Science': 'সাধারণ বিজ্ঞান',
                'ICT': 'তথ্য ও যোগাযোগ প্রযুক্তি',
                'English': 'ইংরেজি',
                'Bangla': 'বাংলা',
                'Bangladesh & Global Studies': 'বাংলাদেশ ও বিশ্বপরিচয়',
                'Accounting': 'হিসাববিজ্ঞান',
                'Finance & Banking': 'ফিন্যান্স ও ব্যাংকিং',
                'Economics': 'অর্থনীতি',
                'Geography & Environment': 'ভূগোল ও পরিবেশ',
                'History': 'ইতিহাস',
                'Civics & Citizenship': 'পৌরনীতি ও নাগরিকতা'
            };

            // Convert to Bangla numerals
            const toBanglaNum = (str) => {
                const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
                return String(str).replace(/[0-9]/g, d => banglaDigits[d]);
            };

            container.innerHTML = filteredData.map(book => {
                // Use Bangla title if available and language is Bangla
                const displayTitle = (currentLang === 'bn' && book.title_bn) ? book.title_bn : book.title;

                // Translate subject and class level for Bangla
                let displaySubject = book.subject;
                let classLabel = `Class ${book.class_level}`;

                if (currentLang === 'bn') {
                    displaySubject = subjectTranslations[book.subject] || book.subject;
                    classLabel = `শ্রেণি ${toBanglaNum(book.class_level)}`;
                }

                return `
                <div class="flex items-center gap-4 bg-surface p-3 rounded-xl border border-divider hover:border-amber/50 transition-colors group cursor-pointer" onclick="window.open('${book.file_url}', '_blank')">
                    <div class="w-10 h-10 rounded-lg bg-amber/10 flex items-center justify-center text-amber text-lg shrink-0 group-hover:scale-110 transition-transform">
                        <i class="fas fa-book"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="text-text-primary font-bold text-sm" title="${displayTitle}">${displayTitle}</h4>
                        <p class="text-text-secondary text-xs">${displaySubject} • ${classLabel}</p>
                    </div>
                    <div class="w-8 h-8 rounded-full bg-surface border border-divider flex items-center justify-center text-text-secondary group-hover:text-amber group-hover:border-amber transition-all">
                        <i class="fas fa-external-link-alt text-xs"></i>
                    </div>
                </div>`;
            }).join('');
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
