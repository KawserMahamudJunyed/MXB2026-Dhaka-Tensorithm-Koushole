// ============================================
// NCTB 2026 Academic Year - Complete Subject & Chapter List
// Class 6-8 - General Curriculum (No Group System)
// Class 9-10 (SSC) - 2012 Curriculum with Group System
// Class 11-12 (HSC) - Standard Group System
// ============================================

// ==================== JUNIOR (CLASS 6-8) ====================

const JUNIOR_SUBJECTS = {
    'Bangla': {
        en: 'Bangla',
        bn: 'বাংলা',
        chapters: [
            { id: 'ch1', en: 'Prose', bn: 'গদ্য' },
            { id: 'ch2', en: 'Poetry', bn: 'কবিতা' },
            { id: 'ch3', en: 'Grammar', bn: 'ব্যাকরণ' },
            { id: 'ch4', en: 'Essay Writing', bn: 'রচনা' }
        ]
    },
    'English': {
        en: 'English',
        bn: 'ইংরেজি',
        chapters: [
            { id: 'ch1', en: 'Reading', bn: 'পড়া' },
            { id: 'ch2', en: 'Writing', bn: 'লেখা' },
            { id: 'ch3', en: 'Grammar', bn: 'ব্যাকরণ' },
            { id: 'ch4', en: 'Vocabulary', bn: 'শব্দভাণ্ডার' }
        ]
    },
    'Mathematics': {
        en: 'Mathematics',
        bn: 'গণিত',
        chapters: [
            { id: 'ch1', en: 'Numbers', bn: 'সংখ্যা' },
            { id: 'ch2', en: 'Algebra', bn: 'বীজগণিত' },
            { id: 'ch3', en: 'Geometry', bn: 'জ্যামিতি' },
            { id: 'ch4', en: 'Statistics', bn: 'পরিসংখ্যান' }
        ]
    },
    'General Science': {
        en: 'General Science',
        bn: 'সাধারণ বিজ্ঞান',
        chapters: [
            { id: 'ch1', en: 'Living World', bn: 'জীবজগৎ' },
            { id: 'ch2', en: 'Matter & Energy', bn: 'পদার্থ ও শক্তি' },
            { id: 'ch3', en: 'Environment', bn: 'পরিবেশ' },
            { id: 'ch4', en: 'Health & Hygiene', bn: 'স্বাস্থ্য ও স্বাস্থ্যবিধি' }
        ]
    },
    'Bangladesh & Global Studies': {
        en: 'Bangladesh & Global Studies',
        bn: 'বাংলাদেশ ও বিশ্বপরিচয়',
        chapters: [
            { id: 'ch1', en: 'Our Country', bn: 'আমাদের দেশ' },
            { id: 'ch2', en: 'History', bn: 'ইতিহাস' },
            { id: 'ch3', en: 'Geography', bn: 'ভূগোল' },
            { id: 'ch4', en: 'Citizenship', bn: 'নাগরিকতা' }
        ]
    },
    'Religion & Moral Education': {
        en: 'Religion & Moral Education',
        bn: 'ধর্ম ও নৈতিক শিক্ষা',
        chapters: [
            { id: 'ch1', en: 'Faith', bn: 'ঈমান' },
            { id: 'ch2', en: 'Worship', bn: 'ইবাদত' },
            { id: 'ch3', en: 'Morals', bn: 'নৈতিকতা' },
            { id: 'ch4', en: 'Biography', bn: 'জীবনী' }
        ]
    },
    'ICT': {
        en: 'ICT',
        bn: 'তথ্য ও যোগাযোগ প্রযুক্তি',
        chapters: [
            { id: 'ch1', en: 'Computer Basics', bn: 'কম্পিউটার পরিচিতি' },
            { id: 'ch2', en: 'Internet', bn: 'ইন্টারনেট' },
            { id: 'ch3', en: 'Office Applications', bn: 'অফিস অ্যাপ্লিকেশন' },
            { id: 'ch4', en: 'Cyber Safety', bn: 'সাইবার নিরাপত্তা' }
        ]
    },
    'Arts & Crafts': {
        en: 'Arts & Crafts',
        bn: 'চারু ও কারুকলা',
        chapters: [
            { id: 'ch1', en: 'Drawing', bn: 'অঙ্কন' },
            { id: 'ch2', en: 'Painting', bn: 'চিত্রাঙ্কন' },
            { id: 'ch3', en: 'Crafts', bn: 'হস্তশিল্প' }
        ]
    },
    'Physical Education': {
        en: 'Physical Education',
        bn: 'শারীরিক শিক্ষা',
        chapters: [
            { id: 'ch1', en: 'Exercise', bn: 'ব্যায়াম' },
            { id: 'ch2', en: 'Sports', bn: 'খেলাধুলা' },
            { id: 'ch3', en: 'Health', bn: 'স্বাস্থ্য' }
        ]
    }
};

// ==================== SSC (CLASS 9-10) ====================

const SSC_COMMON = {
    'Bangla 1st Paper': {
        en: 'Bangla 1st Paper',
        bn: 'বাংলা ১ম পত্র',
        chapters: [
            // Prose (গদ্য)
            { id: 'shuva', en: 'Shuva', bn: 'শুভা' },
            { id: 'boi-pora', en: 'Boi Pora', bn: 'বই পড়া' },
            { id: 'aam-atir-bhepu', en: 'Aam-Atir Bhepu', bn: 'আম-আঁটির ভেঁপু' },
            { id: 'manush-muhammad', en: 'Manush Muhammad (S.)', bn: 'মানুষ মুহম্মদ (স.)' },
            { id: 'nimgach', en: 'Nimgach', bn: 'নিমগাছ' },
            { id: 'upekkhito', en: 'Upekkhito Shoktir Udbodhon', bn: 'উপেক্ষিত শক্তির উদ্বোধন' },
            { id: 'shikkha-manushyatta', en: 'Shikkha O Manushyatta', bn: 'শিক্ষা ও মনুষ্যত্ব' },
            { id: 'probash-bondhu', en: 'Probash Bondhu', bn: 'প্রবাস বন্ধু' },
            { id: 'mamatadi', en: 'Mamatadi', bn: 'মমতাদি' },
            { id: 'ekattorer-dinguli', en: 'Ekattorer Dinguli', bn: 'একাত্তরের দিনগুলি' },
            { id: 'sahityer-rup', en: 'Sahityer Rup O Riti', bn: 'সাহিত্যের রূপ ও রীতি' },
            { id: 'pahela-baishakh', en: 'Pahela Baishakh', bn: 'পয়লা বৈশাখ' },
            // Poetry (কবিতা)
            { id: 'bangabani', en: 'Bangabani', bn: 'বঙ্গবাণী' },
            { id: 'kapotaksha-nad', en: 'Kapotaksha Nad', bn: 'কপোতাক্ষ নদ' },
            { id: 'jibon-sangeet', en: 'Jibon-Sangeet', bn: 'জীবন-সঙ্গীত' },
            { id: 'juta-abishkar', en: 'Juta-Abishkar', bn: 'জুতা-আবিষ্কার' },
            { id: 'jhornar-gaan', en: 'Jhornar Gaan', bn: 'ঝর্ণার গান' },
            { id: 'manush', en: 'Manush', bn: 'মানুষ' },
            { id: 'sei-din-ei-math', en: 'Sei Din Ei Math', bn: 'সেই দিন এই মাঠ' },
            { id: 'pallijanani', en: 'Pallijanani', bn: 'পল্লিজননী' },
            { id: 'asha', en: 'Asha', bn: 'আশা' },
            { id: 'ami-kono-agantuk', en: 'Ami Kono Agantuk Noi', bn: 'আমি কোনো আগন্তুক নই' },
            { id: 'runner', en: 'Runner', bn: 'রানার' },
            { id: 'tomake-pawar', en: 'Tomake Pawar Jonno He Swadhinata', bn: 'তোমাকে পাওয়ার জন্য হে স্বাধীনতা' },
            { id: 'amar-porichoy', en: 'Amar Porichoy', bn: 'আমার পরিচয়' },
            { id: 'swadhinata-shabdo', en: 'Swadhinata Shabdo-ti Kibhabe', bn: 'স্বাধীনতা, এই শব্দটি কীভাবে' },
            // Co-text (সহপাঠ)
            { id: 'kaktarua', en: 'Novel: Kak Tarua', bn: 'উপন্যাস: কাকতাড়ুয়া' },
            { id: 'bohipir', en: 'Drama: Bohipir', bn: 'নাটক: বহিপীর' }
        ]
    },
    'Bangla 2nd Paper': {
        en: 'Bangla 2nd Paper',
        bn: 'বাংলা ২য় পত্র',
        chapters: [
            { id: 'bhasha', en: 'Language', bn: 'ভাষা' },
            { id: 'dhwanitattwa', en: 'Phonology', bn: 'ধ্বনিতত্ত্ব' },
            { id: 'rupatattwa', en: 'Morphology', bn: 'রূপতত্ত্ব' },
            { id: 'bakyatattwa', en: 'Syntax', bn: 'বাক্যতত্ত্ব' },
            { id: 'sarmarm', en: 'Essence/Summary', bn: 'সারমর্ম/সারাংশ' },
            { id: 'bhab-smprasran', en: 'Amplification', bn: 'ভাব-সম্প্রসারণ' },
            { id: 'potrolikhan', en: 'Letter Writing', bn: 'পত্রলিখন/আবেদনপত্র' },
            { id: 'protibedon', en: 'Report Writing', bn: 'প্রতিবেদন' },
            { id: 'probondho', en: 'Essay Writing', bn: 'প্রবন্ধ রচনা' }
        ]
    },
    'English 1st Paper': {
        en: 'English 1st Paper',
        bn: 'ইংরেজি ১ম পত্র',
        chapters: [
            { id: 'unit-1', en: 'Unit 1: Good Citizens', bn: 'ইউনিট ১: ভালো নাগরিক' },
            { id: 'unit-2', en: 'Unit 2: Pastimes', bn: 'ইউনিট ২: অবসর যাপন' },
            { id: 'unit-3', en: 'Unit 3: Events and Festivals', bn: 'ইউনিট ৩: অনুষ্ঠান ও উৎসব' },
            { id: 'unit-4', en: 'Unit 4: Are We Aware?', bn: 'ইউনিট ৪: আমরা কি সচেতন?' },
            { id: 'unit-5', en: 'Unit 5: Nature and Environment', bn: 'ইউনিট ৫: প্রকৃতি ও পরিবেশ' },
            { id: 'unit-6', en: 'Unit 6: Our Neighbours', bn: 'ইউনিট ৬: আমাদের প্রতিবেশী' },
            { id: 'unit-7', en: 'Unit 7: People Who Stand Out', bn: 'ইউনিট ৭: অসাধারণ মানুষ' },
            { id: 'unit-8', en: 'Unit 8: World Heritage', bn: 'ইউনিট ৮: বিশ্ব ঐতিহ্য' },
            { id: 'unit-9', en: 'Unit 9: Unconventional Jobs', bn: 'ইউনিট ৯: অপ্রচলিত পেশা' },
            { id: 'unit-10', en: 'Unit 10: Dreams', bn: 'ইউনিট ১০: স্বপ্ন' },
            { id: 'unit-11', en: 'Unit 11: Renewable Energy', bn: 'ইউনিট ১১: নবায়নযোগ্য শক্তি' },
            { id: 'unit-12', en: 'Unit 12: Roots', bn: 'ইউনিট ১২: শিকড়' },
            { id: 'unit-13', en: 'Unit 13: Media and E-communications', bn: 'ইউনিট ১৩: মিডিয়া ও ই-যোগাযোগ' },
            { id: 'unit-14', en: 'Unit 14: Pleasure and Purpose', bn: 'ইউনিট ১৪: আনন্দ ও উদ্দেশ্য' }
        ]
    },
    'English 2nd Paper': {
        en: 'English 2nd Paper',
        bn: 'ইংরেজি ২য় পত্র',
        chapters: [
            { id: 'gap-filling', en: 'Gap Filling', bn: 'শূন্যস্থান পূরণ' },
            { id: 'substitution', en: 'Substitution Table', bn: 'প্রতিস্থাপন সারণি' },
            { id: 'right-form', en: 'Right Form of Verbs', bn: 'ক্রিয়াপদের সঠিক রূপ' },
            { id: 'narration', en: 'Narrative Style', bn: 'বাক্য রূপান্তর (উক্তি)' },
            { id: 'voice', en: 'Voice Change', bn: 'বাচ্য পরিবর্তন' },
            { id: 'tag-questions', en: 'Tag Questions', bn: 'ট্যাগ প্রশ্ন' },
            { id: 'connectors', en: 'Sentence Connectors', bn: 'বাক্য সংযোগকারী' },
            { id: 'punctuation', en: 'Punctuation', bn: 'বিরাম চিহ্ন' },
            { id: 'cv', en: 'CV with Cover Letter', bn: 'জীবনবৃত্তান্ত ও আবেদনপত্র' },
            { id: 'formal-letters', en: 'Formal Letters/Emails', bn: 'আনুষ্ঠানিক চিঠি/ইমেইল' },
            { id: 'paragraph', en: 'Paragraph Writing', bn: 'অনুচ্ছেদ রচনা' },
            { id: 'composition', en: 'Composition Writing', bn: 'রচনা' }
        ]
    },
    'General Mathematics': {
        en: 'General Mathematics',
        bn: 'সাধারণ গণিত',
        chapters: [
            { id: 'ch1', en: 'Real Numbers', bn: 'বাস্তব সংখ্যা' },
            { id: 'ch2', en: 'Sets & Functions', bn: 'সেট ও ফাংশন' },
            { id: 'ch3', en: 'Algebraic Expressions', bn: 'বীজগাণিতিক রাশি' },
            { id: 'ch4', en: 'Exponents & Logs', bn: 'সূচক ও লগারিদম' },
            { id: 'ch5', en: 'Equations', bn: 'এক চলক বিশিষ্ট সমীকরণ' },
            { id: 'ch6', en: 'Lines & Angles', bn: 'রেখা, কোণ ও ত্রিভুজ' },
            { id: 'ch7', en: 'Practical Geometry', bn: 'ব্যবহারিক জ্যামিতি' },
            { id: 'ch8', en: 'Circle', bn: 'বৃত্ত' },
            { id: 'ch9', en: 'Trigonometry', bn: 'ত্রিকোণমিতিক অনুপাত' },
            { id: 'ch10', en: 'Distance & Elevation', bn: 'দূরত্ব ও উচ্চতা' },
            { id: 'ch11', en: 'Ratio & Proportion', bn: 'বীজগাণিতিক অনুপাত' },
            { id: 'ch12', en: 'Simultaneous Equations', bn: 'দুই চলক বিশিষ্ট সরল সহসমীকরণ' },
            { id: 'ch13', en: 'Finite Series', bn: 'সসীম ধারা' },
            { id: 'ch14', en: 'Similarity', bn: 'অনুপাত, সদৃশতা ও প্রতিসমতা' },
            { id: 'ch15', en: 'Area Theorems', bn: 'ক্ষেত্রফল সম্পর্কিত উপপাদ্য' },
            { id: 'ch16', en: 'Mensuration', bn: 'পরিমিতি' },
            { id: 'ch17', en: 'Statistics', bn: 'পরিসংখ্যান' }
        ]
    },
    'ICT': {
        en: 'ICT',
        bn: 'তথ্য ও যোগাযোগ প্রযুক্তি',
        chapters: [
            { id: 'ch1', en: 'ICT & Our Bangladesh', bn: 'তথ্য ও যোগাযোগ প্রযুক্তি এবং আমাদের বাংলাদেশ' },
            { id: 'ch2', en: 'Computer & User Safety', bn: 'কম্পিউটার ও কম্পিউটার ব্যবহারকারীর নিরাপত্তা' },
            { id: 'ch3', en: 'The Internet in My Education', bn: 'আমার শিক্ষায় ইন্টারনেট' },
            { id: 'ch4', en: 'My Writing & Accounts', bn: 'আমার লেখালেখি ও হিসাব' },
            { id: 'ch5', en: 'Multimedia & Graphics', bn: 'মাল্টিমিডিয়া ও গ্রাফিক্স' },
            { id: 'ch6', en: 'Database Usage', bn: 'ডেটাবেজ-এর ব্যবহার' }
        ]
    }
};

const SSC_SCIENCE = {
    'Physics': {
        en: 'Physics',
        bn: 'পদার্থবিজ্ঞান',
        chapters: [
            { id: 'ch1', en: 'Physical Quantities', bn: 'ভৌত রাশি ও পরিমাপ' },
            { id: 'ch2', en: 'Motion', bn: 'গতি' },
            { id: 'ch3', en: 'Force', bn: 'বল' },
            { id: 'ch4', en: 'Work, Power & Energy', bn: 'কাজ, ক্ষমতা ও শক্তি' },
            { id: 'ch5', en: 'State of Matter', bn: 'পদার্থের অবস্থা ও চাপ' },
            { id: 'ch6', en: 'Heat', bn: 'বস্তুর ওপর তাপের প্রভাব' },
            { id: 'ch7', en: 'Waves & Sound', bn: 'তরঙ্গ ও শব্দ' },
            { id: 'ch8', en: 'Reflection', bn: 'আলোর প্রতিফলন' },
            { id: 'ch9', en: 'Refraction', bn: 'আলোর প্রতিসরণ' },
            { id: 'ch10', en: 'Static Electricity', bn: 'স্থির তড়িৎ' },
            { id: 'ch11', en: 'Current Electricity', bn: 'চল তড়িৎ' },
            { id: 'ch12', en: 'Magnetic Effect', bn: 'বিদ্যুতের চৌম্বক ক্রিয়া' },
            { id: 'ch13', en: 'Modern Physics', bn: 'আধুনিক পদার্থবিজ্ঞান' },
            { id: 'ch14', en: 'Saving Life', bn: 'জীবন বাঁচাতে পদার্থবিজ্ঞান' }
        ]
    },
    'Chemistry': {
        en: 'Chemistry',
        bn: 'রসায়ন',
        chapters: [
            { id: 'ch1', en: 'Concepts', bn: 'রসায়নের ধারণা' },
            { id: 'ch2', en: 'States of Matter', bn: 'পদার্থের অবস্থা' },
            { id: 'ch3', en: 'Structure', bn: 'পদার্থের গঠন' },
            { id: 'ch4', en: 'Periodic Table', bn: 'পর্যায় সারণি' },
            { id: 'ch5', en: 'Bonds', bn: 'রাসায়নিক বন্ধন' },
            { id: 'ch6', en: 'Mole Concept', bn: 'মোলের ধারণা' },
            { id: 'ch7', en: 'Reactions', bn: 'রাসায়নিক বিক্রিয়া' },
            { id: 'ch8', en: 'Energy', bn: 'রসায়ন ও শক্তি' },
            { id: 'ch9', en: 'Acid-Base', bn: 'এসিড-ক্ষার সমতা' },
            { id: 'ch10', en: 'Mineral Resources', bn: 'খনিজ সম্পদ: ধাতু-অধাতু' },
            { id: 'ch11', en: 'Fossils', bn: 'খনিজ সম্পদ: জীবাশ্ম' },
            { id: 'ch12', en: 'Life Chemistry', bn: 'আমাদের জীবনে রসায়ন' }
        ]
    },
    'Biology': {
        en: 'Biology',
        bn: 'জীববিজ্ঞান',
        chapters: [
            { id: 'ch1', en: 'Life Lessons', bn: 'জীবন পাঠ' },
            { id: 'ch2', en: 'Cells', bn: 'জীবকোষ ও টিস্যু' },
            { id: 'ch3', en: 'Division', bn: 'কোষ বিভাজন' },
            { id: 'ch4', en: 'Bioenergetics', bn: 'জীবনীশক্তি' },
            { id: 'ch5', en: 'Nutrition', bn: 'খাদ্য, পুষ্টি ও পরিপাক' },
            { id: 'ch6', en: 'Transport', bn: 'জীবে পরিবহন' },
            { id: 'ch7', en: 'Gas Exchange', bn: 'গ্যাসীয় বিনিময়' },
            { id: 'ch8', en: 'Excretion', bn: 'রেচন' },
            { id: 'ch9', en: 'Locomotion', bn: 'দৃঢ়তা ও চলন' },
            { id: 'ch10', en: 'Coordination', bn: 'সমন্বয়' },
            { id: 'ch11', en: 'Reproduction', bn: 'জীবের প্রজনন' },
            { id: 'ch12', en: 'Heredity', bn: 'বংশগতি ও বিবর্তন' },
            { id: 'ch13', en: 'Environment', bn: 'জীবের পরিবেশ' },
            { id: 'ch14', en: 'Biotech', bn: 'জীবপ্রযুক্তি' }
        ]
    },
    'Higher Mathematics': {
        en: 'Higher Mathematics',
        bn: 'উচ্চতর গণিত',
        chapters: [
            { id: 'ch1', en: 'Sets & Functions', bn: 'সেট ও ফাংশন' },
            { id: 'ch2', en: 'Algebraic Expressions', bn: 'বীজগাণিতিক রাশি' },
            { id: 'ch3', en: 'Indices & Logarithms', bn: 'সূচক ও লগারিদম' },
            { id: 'ch4', en: 'Equations', bn: 'সমীকরণ' },
            { id: 'ch5', en: 'Geometry', bn: 'জ্যামিতি' },
            { id: 'ch6', en: 'Trigonometry', bn: 'ত্রিকোণমিতি' },
            { id: 'ch7', en: 'Mensuration', bn: 'পরিমিতি' },
            { id: 'ch8', en: 'Statistics', bn: 'পরিসংখ্যান' }
        ]
    },
    'Bangladesh & Global Studies': {
        en: 'Bangladesh & Global Studies',
        bn: 'বাংলাদেশ ও বিশ্বপরিচয়',
        chapters: [
            { id: 'ch1', en: 'East Bengal Movement', bn: 'পূর্ব বাংলার আন্দোলন ও জাতীয়তাবাদের উত্থান' },
            { id: 'ch2', en: 'Independent Bangladesh', bn: 'স্বাধীন বাংলাদেশ' },
            { id: 'ch3', en: 'Solar System', bn: 'সৌরজগৎ ও ভূমণ্ডল' },
            { id: 'ch4', en: 'Configuration of Land', bn: 'বাংলাদেশের ভূপ্রকৃতি ও জলবায়ু' },
            { id: 'ch5', en: 'Rivers', bn: 'বাংলাদেশের নদ-নদী' },
            { id: 'ch6', en: 'State & Citizenship', bn: 'রাষ্ট্র, নাগরিকতা ও আইন' },
            { id: 'ch7', en: 'Govt Organs', bn: 'বাংলাদেশ সরকারের বিভিন্ন অঙ্গ' },
            { id: 'ch8', en: 'Democracy', bn: 'বাংলাদেশের গণতন্ত্র ও নির্বাচন' },
            { id: 'ch9', en: 'UN & BD', bn: 'জাতিসংঘ ও বাংলাদেশ' },
            { id: 'ch10', en: 'National Resources', bn: 'জাতীয় সম্পদ ও অর্থনৈতিক ব্যবস্থা' },
            { id: 'ch11', en: 'Economic Indicators', bn: 'অর্থনৈতিক নির্দেশক' },
            { id: 'ch12', en: 'Financial System', bn: 'বাংলাদেশ সরকারের অর্থ ও ব্যাংক ব্যবস্থা' },
            { id: 'ch13', en: 'Family Structure', bn: 'বাংলাদেশের পরিবার কাঠামো' },
            { id: 'ch14', en: 'Social Change', bn: 'বাংলাদেশের সামাজিক পরিবর্তন' },
            { id: 'ch15', en: 'Social Problems', bn: 'বাংলাদেশের সামাজিক সমস্যা ও এর প্রতিকার' }
        ]
    }
};

const SSC_BUSINESS = {
    'General Science': {
        en: 'General Science',
        bn: 'সাধারণ বিজ্ঞান',
        chapters: [
            { id: 'ch1', en: 'Better Living', bn: 'উন্নততর জীবনধারা' },
            { id: 'ch2', en: 'Water', bn: 'জীবনের জন্য পানি' },
            { id: 'ch3', en: 'Heart', bn: 'হৃদযন্ত্রের যত কথা' },
            { id: 'ch4', en: 'New Life', bn: 'নবজীবনের সূচনা' },
            { id: 'ch5', en: 'Light', bn: 'দেখতে হলে আলো চাই' },
            { id: 'ch6', en: 'Polymer', bn: 'পলিমার' },
            { id: 'ch7', en: 'Acid, Base, Salt', bn: 'অম্ল, ক্ষারক ও লবণের ব্যবহার' },
            { id: 'ch8', en: 'Resources', bn: 'আমাদের সম্পদ' },
            { id: 'ch9', en: 'Disaster', bn: 'দুর্যোগের সাথে বসবাস' },
            { id: 'ch10', en: 'Force', bn: 'এসো বলকে জানি' },
            { id: 'ch11', en: 'Biotech', bn: 'জীবপ্রযুক্তি' },
            { id: 'ch12', en: 'Electricity', bn: 'প্রাত্যহিক জীবনে তড়িৎ' },
            { id: 'ch13', en: 'Communication', bn: 'সবাই কাছাকাছি' },
            { id: 'ch14', en: 'Saving Life', bn: 'জীবন বাঁচাতে বিজ্ঞান' }
        ]
    },
    'Accounting': {
        en: 'Accounting',
        bn: 'হিসাববিজ্ঞান',
        chapters: [
            { id: 'ch1', en: 'Introduction', bn: 'পরিচিতি' },
            { id: 'ch2', en: 'Transactions', bn: 'লেনদেন' },
            { id: 'ch3', en: 'Double Entry', bn: 'দুতরফা দাখিলা' },
            { id: 'ch4', en: 'Capital/Revenue', bn: 'মূলধন ও মুনাফা' },
            { id: 'ch5', en: 'Accounts', bn: 'হিসাব' },
            { id: 'ch6', en: 'Journal', bn: 'জাবেদা' },
            { id: 'ch7', en: 'Ledger', bn: 'খতিয়ান' },
            { id: 'ch8', en: 'Cash Book', bn: 'নগদান বই' },
            { id: 'ch9', en: 'Trial Balance', bn: 'রেওয়ামিল' },
            { id: 'ch10', en: 'Financial Statements', bn: 'আর্থিক বিবরণী' },
            { id: 'ch11', en: 'Cost Price', bn: 'পণ্যের ক্রয়মূল্য' },
            { id: 'ch12', en: 'Family Budgeting', bn: 'পারিবারিক ও আত্মকর্মসংস্থানমূলক উদ্যোগের হিসাব' }
        ]
    },
    'Finance & Banking': {
        en: 'Finance & Banking',
        bn: 'ফিন্যান্স ও ব্যাংকিং',
        chapters: [
            { id: 'ch1', en: 'Finance', bn: 'অর্থায়ন ও ব্যবসায় অর্থায়ন' },
            { id: 'ch2', en: 'Sources of Fund', bn: 'অর্থায়নের উৎস' },
            { id: 'ch3', en: 'Time Value', bn: 'অর্থের সময়মূল্য' },
            { id: 'ch4', en: 'Risk', bn: 'ঝুঁকি ও অনিশ্চয়তা' },
            { id: 'ch5', en: 'Capital Budgeting', bn: 'মূলধনি বাজেটিং' },
            { id: 'ch6', en: 'Cost of Capital', bn: 'মূলধন ব্যয়' },
            { id: 'ch7', en: 'Share, Bond', bn: 'শেয়ার, বন্ড ও ডিবেঞ্চার' },
            { id: 'ch8', en: 'Currency & Bank', bn: 'মুদ্রা, ব্যাংক ও ব্যাংকিং' },
            { id: 'ch9', en: 'Banking Business', bn: 'ব্যাংকিং ব্যবসায় ও তার ধরণ' },
            { id: 'ch10', en: 'Commercial Bank', bn: 'বাণিজ্যিক ব্যাংক' },
            { id: 'ch11', en: 'Bank Deposits', bn: 'ব্যাংকের আমানত' },
            { id: 'ch12', en: 'Bank-Customer Relation', bn: 'ব্যাংক ও গ্রাহকের সম্পর্ক' },
            { id: 'ch13', en: 'Central Bank', bn: 'কেন্দ্রীয় ব্যাংক' }
        ]
    },
    'Business Entrepreneurship': {
        en: 'Business Entrepreneurship',
        bn: 'ব্যবসায় উদ্যোগ',
        chapters: [
            { id: 'ch1', en: 'Intro to Business', bn: 'ব্যবসায় পরিচিতি' },
            { id: 'ch2', en: 'Entrepreneurship', bn: 'ব্যবসায় উদ্যোগ ও উদ্যোক্তা' },
            { id: 'ch3', en: 'Self-Employment', bn: 'আত্মকর্মসংস্থান' },
            { id: 'ch4', en: 'Ownership', bn: 'মালিকানার ভিত্তিতে ব্যবসায়' },
            { id: 'ch5', en: 'Legal Aspects', bn: 'ব্যবসায়ের আইনগত দিক' },
            { id: 'ch6', en: 'Business Plan', bn: 'ব্যবসায় পরিকল্পনা' },
            { id: 'ch7', en: 'BD Industries', bn: 'বাংলাদেশের শিল্প' },
            { id: 'ch8', en: 'Management', bn: 'ব্যবসায় প্রতিষ্ঠানের ব্যবস্থাপনা' },
            { id: 'ch9', en: 'Marketing', bn: 'বিপণন' },
            { id: 'ch10', en: 'Assistance', bn: 'ব্যবসায় উদ্যোগে সহায়তাকারী সেবা' },
            { id: 'ch11', en: 'Ethics', bn: 'ব্যবসায়ের নৈতিকতা ও সামাজিক দায়বদ্ধতা' },
            { id: 'ch12', en: 'Success Stories', bn: 'সফল উদ্যোক্তাদের জীবনী থেকে শিক্ষণীয়' }
        ]
    }
};

const SSC_HUMANITIES = {
    'General Science': SSC_BUSINESS['General Science'], // Same as Business
    'Geography & Environment': {
        en: 'Geography & Environment',
        bn: 'ভূগোল ও পরিবেশ',
        chapters: [
            { id: 'ch1', en: 'Geography', bn: 'ভূগোল ও পরিবেশ' },
            { id: 'ch2', en: 'Universe', bn: 'মহাবিশ্ব ও আমাদের পৃথিবী' },
            { id: 'ch3', en: 'Map Reading', bn: 'মানচিত্র পঠন ও ব্যবহার' },
            { id: 'ch4', en: 'Earth Structure', bn: 'পৃথিবীর অভ্যন্তরীণ ও বাহ্যিক গঠন' },
            { id: 'ch5', en: 'Atmosphere', bn: 'বায়ুমণ্ডল' },
            { id: 'ch6', en: 'Bari-sphere', bn: 'বারিমণ্ডল' },
            { id: 'ch7', en: 'Population', bn: 'জনসংখ্যা' },
            { id: 'ch8', en: 'Human Settlements', bn: 'মানব বসতি' },
            { id: 'ch9', en: 'Resources', bn: 'সম্পদ ও অর্থনৈতিক কার্যাবলি' },
            { id: 'ch10', en: 'BD Geography', bn: 'বাংলাদেশের ভৌগোলিক বিবরণ' },
            { id: 'ch11', en: 'BD Resources', bn: 'বাংলাদেশের সম্পদ ও শিল্প' },
            { id: 'ch12', en: 'Communication', bn: 'বাংলাদেশের যোগাযোগ ব্যবস্থা ও বাণিজ্য' },
            { id: 'ch13', en: 'Development', bn: 'বাংলাদেশের উন্নয়ন কর্মকাণ্ড' },
            { id: 'ch14', en: 'Disaster Management', bn: 'বাংলাদেশের প্রাকৃতিক দুর্যোগ' }
        ]
    },
    'History of BD & World': {
        en: 'History of BD & World',
        bn: 'বাংলাদেশের ইতিহাস ও বিশ্বসভ্যতা',
        chapters: [
            { id: 'ch1', en: 'Intro to History', bn: 'ইতিহাস পরিচিতি' },
            { id: 'ch2', en: 'World Civilization', bn: 'বিশ্বসভ্যতা' },
            { id: 'ch3', en: 'Ancient Janapadas', bn: 'প্রাচীন বাংলার জনপদ' },
            { id: 'ch4', en: 'Ancient Politics', bn: 'প্রাচীন বাংলার রাজনৈতিক ইতিহাস' },
            { id: 'ch5', en: 'Ancient Society', bn: 'প্রাচীন বাংলার আর্থসামাজিক ইতিহাস' },
            { id: 'ch6', en: 'Medieval Bengal', bn: 'মধ্যযুগের বাংলা' },
            { id: 'ch7', en: 'Medieval Society', bn: 'মধ্যযুগের আর্থসামাজিক ইতিহাস' },
            { id: 'ch8', en: 'English Rule', bn: 'বাংলায় ইংরেজ শাসনের সূচনাপর্ব' },
            { id: 'ch9', en: 'Resistance', bn: 'ইংরেজ আমলে প্রতিরোধ আন্দোলন' },
            { id: 'ch10', en: 'Nationalism', bn: 'স্বাধিকার আন্দোলন' },
            { id: 'ch11', en: 'Language Movement', bn: 'ভাষা আন্দোলন' },
            { id: 'ch12', en: 'Military Rule', bn: 'সামরিক শাসন ও স্বাধিকার আন্দোলন' },
            { id: 'ch13', en: '1970 Election', bn: 'সত্তরের নির্বাচন ও মুক্তিযুদ্ধ' },
            { id: 'ch14', en: 'Bangabandhu Era', bn: 'বঙ্গবন্ধুর শাসনকাল' },
            { id: 'ch15', en: 'Post-1975 Era', bn: 'সামরিক শাসন ও পরবর্তী ঘটনা' }
        ]
    },
    'Civics & Citizenship': {
        en: 'Civics & Citizenship',
        bn: 'পৌরনীতি ও নাগরিকতা',
        chapters: [
            { id: 'ch1', en: 'Civics Intro', bn: 'পৌরনীতি ও নাগরিকতা' },
            { id: 'ch2', en: 'Citizen', bn: 'নাগরিক ও নাগরিকতা' },
            { id: 'ch3', en: 'Law & Liberty', bn: 'আইন, স্বাধীনতা ও সাম্য' },
            { id: 'ch4', en: 'State & Govt', bn: 'রাষ্ট্র ও সরকার ব্যবস্থা' },
            { id: 'ch5', en: 'Constitution', bn: 'সংবিধান' },
            { id: 'ch6', en: 'BD Govt', bn: 'বাংলাদেশের সরকার ব্যবস্থা' },
            { id: 'ch7', en: 'Political Parties', bn: 'গণতন্ত্রে রাজনৈতিক দল ও নির্বাচন' },
            { id: 'ch8', en: 'Local Govt', bn: 'বাংলাদেশের স্থানীয় সরকার' },
            { id: 'ch9', en: 'Citizen Problems', bn: 'নাগরিক সমস্যা ও আমাদের করণীয়' },
            { id: 'ch10', en: 'Independence', bn: 'স্বাধীন বাংলাদেশের অভ্যুদয়ে নাগরিক চেতনা' },
            { id: 'ch11', en: 'Int Organizations', bn: 'বাংলাদেশ ও আন্তর্জাতিক সংগঠন' }
        ]
    }
};

// ==================== HSC (CLASS 11-12) ====================

const HSC_COMMON = {
    'ICT': {
        en: 'ICT',
        bn: 'তথ্য ও যোগাযোগ প্রযুক্তি',
        chapters: [
            { id: 'ch1', en: 'Global & BD Perspective', bn: 'বিশ্ব ও বাংলাদেশ প্রেক্ষিত' },
            { id: 'ch2', en: 'Communication Systems', bn: 'কমিউনিকেশন সিস্টেম ও নেটওয়ার্কিং' },
            { id: 'ch3', en: 'Number Systems', bn: 'সংখ্যা পদ্ধতি ও ডিজিটাল ডিভাইস' },
            { id: 'ch4', en: 'Web Design & HTML', bn: 'ওয়েব ডিজাইন পরিচিতি এবং HTML' },
            { id: 'ch5', en: 'Programming in C', bn: 'প্রোগ্রামিং ভাষা' },
            { id: 'ch6', en: 'Database Management', bn: 'ডেটাবেজ ম্যানেজমেন্ট সিস্টেম' }
        ]
    }
};

const HSC_SCIENCE = {
    'Higher Mathematics 1st Paper': {
        en: 'Higher Mathematics 1st Paper',
        bn: 'উচ্চতর গণিত ১ম পত্র',
        chapters: [
            { id: 'ch1', en: 'Matrices', bn: 'ম্যাট্রিক্স ও নির্ণায়ক' },
            { id: 'ch2', en: 'Vectors', bn: 'ভেক্টর' },
            { id: 'ch3', en: 'Straight Lines', bn: 'সরলরেখা' },
            { id: 'ch4', en: 'Circle', bn: 'বৃত্ত' },
            { id: 'ch5', en: 'Permutation', bn: 'বিন্যাস ও সমাবেশ' },
            { id: 'ch6', en: 'Trigonometry', bn: 'ত্রিকোণমিতি' },
            { id: 'ch7', en: 'Associated Angles', bn: 'সংযুক্ত কোণের অনুপাত' },
            { id: 'ch8', en: 'Functions', bn: 'ফাংশন' },
            { id: 'ch9', en: 'Differentiation', bn: 'অন্তরীকরণ' },
            { id: 'ch10', en: 'Integration', bn: 'যৌগজীকরণ' }
        ]
    },
    'Higher Mathematics 2nd Paper': {
        en: 'Higher Mathematics 2nd Paper',
        bn: 'উচ্চতর গণিত ২য় পত্র',
        chapters: [
            { id: 'ch1', en: 'Real Numbers', bn: 'বাস্তব সংখ্যা' },
            { id: 'ch2', en: 'Linear Programming', bn: 'যোগাশ্রয়ী প্রোগ্রাম' },
            { id: 'ch3', en: 'Complex Numbers', bn: 'জটিল সংখ্যা' },
            { id: 'ch4', en: 'Polynomials', bn: 'বহুপদী' },
            { id: 'ch5', en: 'Binomial', bn: 'দ্বিপদী বিস্তৃতি' },
            { id: 'ch6', en: 'Conics', bn: 'কণিক' },
            { id: 'ch7', en: 'Inverse Trig', bn: 'বিপরীত ত্রিকোণমিতিক ফাংশন' },
            { id: 'ch8', en: 'Statics', bn: 'স্থিতিবিদ্যা' },
            { id: 'ch9', en: 'Dynamics', bn: 'সমতলে বস্তুকণার গতি' }
        ]
    },
    'Physics 1st Paper': {
        en: 'Physics 1st Paper',
        bn: 'পদার্থবিজ্ঞান ১ম পত্র',
        chapters: [
            { id: 'ch1', en: 'Physical World', bn: 'ভৌত জগৎ' },
            { id: 'ch2', en: 'Vectors', bn: 'ভেক্টর' },
            { id: 'ch3', en: 'Dynamics', bn: 'গতিবিদ্যা' },
            { id: 'ch4', en: 'Mechanics', bn: 'নিউটনীয় বলবিদ্যা' },
            { id: 'ch5', en: 'Work/Energy', bn: 'কাজ, শক্তি ও ক্ষমতা' },
            { id: 'ch6', en: 'Gravity', bn: 'মহাকর্ষ ও অভিকর্ষ' },
            { id: 'ch7', en: 'Matter Properties', bn: 'পদার্থের গাঠনিক ধর্ম' },
            { id: 'ch8', en: 'Periodic Motion', bn: 'পর্যায়বৃত্ত গতি' },
            { id: 'ch9', en: 'Waves', bn: 'তরঙ্গ' },
            { id: 'ch10', en: 'Gas Theory', bn: 'আদর্শ গ্যাস ও গ্যাসের গতিতত্ত্ব' }
        ]
    },
    'Physics 2nd Paper': {
        en: 'Physics 2nd Paper',
        bn: 'পদার্থবিজ্ঞান ২য় পত্র',
        chapters: [
            { id: 'ch1', en: 'Thermodynamics', bn: 'তাপগতিবিদ্যা' },
            { id: 'ch2', en: 'Static Electricity', bn: 'স্থির তড়িৎ' },
            { id: 'ch3', en: 'Current Electricity', bn: 'চল তড়িৎ' },
            { id: 'ch4', en: 'Magnetic Effect', bn: 'তড়িৎ প্রবাহের চৌম্বক ক্রিয়া' },
            { id: 'ch5', en: 'EMF Induction', bn: 'তাড়িতচৌম্বক আবেশ' },
            { id: 'ch6', en: 'Geometric Optics', bn: 'জ্যামিতিক আলোকবিজ্ঞান' },
            { id: 'ch7', en: 'Physical Optics', bn: 'ভৌত আলোকবিজ্ঞান' },
            { id: 'ch8', en: 'Modern Physics', bn: 'আধুনিক পদার্থবিজ্ঞান' },
            { id: 'ch9', en: 'Atomic Model', bn: 'পরমাণুর মডেল' },
            { id: 'ch10', en: 'Semiconductor', bn: 'সেমিকন্ডাক্টর' }
        ]
    },
    'Chemistry 1st Paper': {
        en: 'Chemistry 1st Paper',
        bn: 'রসায়ন ১ম পত্র',
        chapters: [
            { id: 'ch1', en: 'Lab Safety', bn: 'ল্যাবরেটরির নিরাপদ ব্যবহার' },
            { id: 'ch2', en: 'Qualitative', bn: 'গুণগত রসায়ন' },
            { id: 'ch3', en: 'Periodic Properties', bn: 'মৌলের পর্যায়বৃত্ত ধর্ম ও রাসায়নিক বন্ধন' },
            { id: 'ch4', en: 'Chemical Changes', bn: 'রাসায়নিক পরিবর্তন' },
            { id: 'ch5', en: 'Applied Chemistry', bn: 'কর্মমুখী রসায়ন' }
        ]
    },
    'Chemistry 2nd Paper': {
        en: 'Chemistry 2nd Paper',
        bn: 'রসায়ন ২য় পত্র',
        chapters: [
            { id: 'ch1', en: 'Environmental', bn: 'পরিবেশ রসায়ন' },
            { id: 'ch2', en: 'Organic', bn: 'জৈব রসায়ন' },
            { id: 'ch3', en: 'Quantitative', bn: 'পরিমাণগত রসায়ন' },
            { id: 'ch4', en: 'Electrochemistry', bn: 'তড়িৎ রসায়ন' },
            { id: 'ch5', en: 'Economic', bn: 'অর্থনৈতিক রসায়ন' }
        ]
    },
    'Biology 1st Paper': {
        en: 'Biology 1st Paper',
        bn: 'জীববিজ্ঞান ১ম পত্র',
        chapters: [
            { id: 'ch1', en: 'Cell Structure', bn: 'কোষ ও এর গঠন' },
            { id: 'ch2', en: 'Cell Division', bn: 'কোষ বিভাজন' },
            { id: 'ch3', en: 'Cell Chemistry', bn: 'কোষ রসায়ন' },
            { id: 'ch4', en: 'Microbes', bn: 'অণুজীব' },
            { id: 'ch5', en: 'Algae/Fungi', bn: 'শৈবাল ও ছত্রাক' },
            { id: 'ch6', en: 'Bryophyta', bn: 'ব্রায়োফাইটা' },
            { id: 'ch7', en: 'Gymnosperm', bn: 'নগ্নবীজী' },
            { id: 'ch8', en: 'Tissue', bn: 'টিস্যু' },
            { id: 'ch9', en: 'Physiology', bn: 'উদ্ভিদ শারীরতত্ত্ব' },
            { id: 'ch10', en: 'Reproduction', bn: 'উদ্ভিদ প্রজনন' },
            { id: 'ch11', en: 'Biotech', bn: 'জীবপ্রযুক্তি' },
            { id: 'ch12', en: 'Environment', bn: 'জীবের পরিবেশ' }
        ]
    },
    'Biology 2nd Paper': {
        en: 'Biology 2nd Paper',
        bn: 'জীববিজ্ঞান ২য় পত্র',
        chapters: [
            { id: 'ch1', en: 'Animal Diversity', bn: 'প্রাণীর বিভিন্নতা' },
            { id: 'ch2', en: 'Intro Animals', bn: 'প্রাণী পরিচিতি' },
            { id: 'ch3', en: 'Digestion', bn: 'পরিপাক' },
            { id: 'ch4', en: 'Blood', bn: 'রক্ত' },
            { id: 'ch5', en: 'Respiration', bn: 'শ্বসন' },
            { id: 'ch6', en: 'Excretion', bn: 'বর্জ্য নিষ্কাশন' },
            { id: 'ch7', en: 'Movement', bn: 'চলন' },
            { id: 'ch8', en: 'Coordination', bn: 'সমন্বয়' },
            { id: 'ch9', en: 'Reproduction', bn: 'মানব জীবনের ধারাবাহিকতা' },
            { id: 'ch10', en: 'Immunity', bn: 'প্রতিরক্ষা' },
            { id: 'ch11', en: 'Genetics', bn: 'জিনতত্ত্ব' },
            { id: 'ch12', en: 'Behavior', bn: 'প্রাণীর আচরণ' }
        ]
    }
};

const HSC_BUSINESS = {
    'Accounting 1st Paper': {
        en: 'Accounting 1st Paper',
        bn: 'হিসাববিজ্ঞান ১ম পত্র',
        chapters: [
            { id: 'ch1', en: 'Accounting', bn: 'হিসাববিজ্ঞান পরিচিতি' },
            { id: 'ch2', en: 'Books of Accounts', bn: 'হিসাবের বইসমূহ' },
            { id: 'ch3', en: 'Bank Reconciliation', bn: 'ব্যাংক সমন্বয় বিবরণী' },
            { id: 'ch4', en: 'Rewamil', bn: 'রেওয়ামিল' },
            { id: 'ch5', en: 'Principles', bn: 'হিসাববিজ্ঞানের নীতিমালা' },
            { id: 'ch6', en: 'Receivables', bn: 'প্রাপ্য হিসাবের হিসাবরক্ষণ' },
            { id: 'ch7', en: 'Work Sheet', bn: 'কার্যপত্র' },
            { id: 'ch8', en: 'Tangible Assets', bn: 'দৃশ্যমান ও অদৃশ্যমান সম্পদের হিসাবরক্ষণ' },
            { id: 'ch9', en: 'Financial Statements', bn: 'আর্থিক বিবরণী' },
            { id: 'ch10', en: 'Single Entry', bn: 'একতরফা দাখিলা' }
        ]
    },
    'Accounting 2nd Paper': {
        en: 'Accounting 2nd Paper',
        bn: 'হিসাববিজ্ঞান ২য় পত্র',
        chapters: [
            { id: 'ch1', en: 'Non-Profit', bn: 'অব্যবসায়ী প্রতিষ্ঠানের হিসাব' },
            { id: 'ch2', en: 'Partnership', bn: 'অংশীদারি কারবারের হিসাব' },
            { id: 'ch3', en: 'Cash Flow', bn: 'নগদ প্রবাহ বিবরণী' },
            { id: 'ch4', en: 'Joint Stock Capital', bn: 'যৌথ মূলধনি কোম্পানির মূলধন' },
            { id: 'ch5', en: 'Financial Statements', bn: 'যৌথ মূলধনি কোম্পানির আর্থিক বিবরণী' },
            { id: 'ch6', en: 'Analysis', bn: 'আর্থিক বিবরণী বিশ্লেষণ' },
            { id: 'ch7', en: 'Cost Accounting', bn: 'উৎপাদন ব্যয় হিসাব' },
            { id: 'ch8', en: 'Stock', bn: 'মজুদ পণ্যের হিসাবরক্ষণ' },
            { id: 'ch9', en: 'Cost & Volume', bn: 'ব্যয় ও ব্যয়ের শ্রেণিবিন্যাস' },
            { id: 'ch10', en: 'Management Accounting', bn: 'ব্যবস্থাপনা হিসাববিজ্ঞান পরিচিতি' }
        ]
    },
    'Management 1st Paper': {
        en: 'Management 1st Paper',
        bn: 'ব্যবস্থাপনা ১ম পত্র',
        chapters: [
            { id: 'ch1', en: 'Nature', bn: 'মৌলিক ধারণা' },
            { id: 'ch2', en: 'Environment', bn: 'পরিবেশ' },
            { id: 'ch3', en: 'Types', bn: 'ধরন' },
            { id: 'ch4', en: 'Partnership', bn: 'অংশীদারি' },
            { id: 'ch5', en: 'Joint Stock', bn: 'যৌথ মূলধনি' },
            { id: 'ch6', en: 'Co-operative', bn: 'সমবায়' },
            { id: 'ch7', en: 'State', bn: 'রাষ্ট্রীয়' },
            { id: 'ch8', en: 'Legal', bn: 'আইনগত' },
            { id: 'ch9', en: 'Support', bn: 'সহায়ক সেবা' },
            { id: 'ch10', en: 'Entrepreneurship', bn: 'উদ্যোগ' },
            { id: 'ch11', en: 'ICT', bn: 'আইসিটি' },
            { id: 'ch12', en: 'Ethics', bn: 'নৈতিকতা' }
        ]
    },
    'Management 2nd Paper': {
        en: 'Management 2nd Paper',
        bn: 'ব্যবস্থাপনা ২য় পত্র',
        chapters: [
            { id: 'ch1', en: 'Concepts', bn: 'ধারণা' },
            { id: 'ch2', en: 'Principles', bn: 'নীতি' },
            { id: 'ch3', en: 'Planning', bn: 'পরিকল্পনা' },
            { id: 'ch4', en: 'Organizing', bn: 'সংগঠিতকরণ' },
            { id: 'ch5', en: 'Staffing', bn: 'কর্মীসংস্থান' },
            { id: 'ch6', en: 'Leadership', bn: 'নেতৃত্ব' },
            { id: 'ch7', en: 'Motivation', bn: 'প্রেষণা' },
            { id: 'ch8', en: 'Communication', bn: 'যোগাযোগ' },
            { id: 'ch9', en: 'Coordination', bn: 'সমন্বয়' },
            { id: 'ch10', en: 'Control', bn: 'নিয়ন্ত্রণ' }
        ]
    },
    'Finance 1st Paper': {
        en: 'Finance 1st Paper',
        bn: 'ফিন্যান্স ১ম পত্র',
        chapters: [
            { id: 'ch1', en: 'Introduction', bn: 'সূচনা' },
            { id: 'ch2', en: 'Legal', bn: 'আইনগত' },
            { id: 'ch3', en: 'Time Value', bn: 'সময়মূল্য' },
            { id: 'ch4', en: 'Analysis', bn: 'বিশ্লেষণ' },
            { id: 'ch5', en: 'Short-term', bn: 'স্বল্পমেয়াদী' },
            { id: 'ch6', en: 'Long-term', bn: 'দীর্ঘমেয়াদী' },
            { id: 'ch7', en: 'Cost of Capital', bn: 'মূলধন ব্যয়' },
            { id: 'ch8', en: 'Capital Budgeting', bn: 'মূলধন বাজেটিং' },
            { id: 'ch9', en: 'Risk', bn: 'ঝুঁকি' }
        ]
    },
    'Finance 2nd Paper': {
        en: 'Finance 2nd Paper',
        bn: 'ফিন্যান্স ২য় পত্র',
        chapters: [
            { id: 'ch1', en: 'Banking', bn: 'ব্যাংকিং' },
            { id: 'ch2', en: 'Central Bank', bn: 'কেন্দ্রীয় ব্যাংক' },
            { id: 'ch3', en: 'Commercial Bank', bn: 'বাণিজ্যিক ব্যাংক' },
            { id: 'ch4', en: 'Bank Account', bn: 'ব্যাংক হিসাব' },
            { id: 'ch5', en: 'Instruments', bn: 'ঋণের দলিল' },
            { id: 'ch6', en: 'Cheque', bn: 'চেক' },
            { id: 'ch7', en: 'Bill', bn: 'বিনিময় বিল' },
            { id: 'ch8', en: 'E-Banking', bn: 'আধুনিক ব্যাংকিং' },
            { id: 'ch9', en: 'Insurance', bn: 'বিমা' },
            { id: 'ch10', en: 'Life Insurance', bn: 'জীবন বিমা' },
            { id: 'ch11', en: 'Marine', bn: 'নৌ বিমা' },
            { id: 'ch12', en: 'Fire', bn: 'অগ্নি বিমা' }
        ]
    }
};

const HSC_HUMANITIES = {
    'Economics 1st Paper': {
        en: 'Economics 1st Paper',
        bn: 'অর্থনীতি ১ম পত্র',
        chapters: [
            { id: 'ch1', en: 'Basic Problems', bn: 'মৌলিক অর্থনৈতিক সমস্যা' },
            { id: 'ch2', en: 'Consumer/Producer', bn: 'ভোক্তা ও উৎপাদকের আচরণ' },
            { id: 'ch3', en: 'Production', bn: 'উৎপাদন, উৎপাদন ব্যয় ও আয়' },
            { id: 'ch4', en: 'Market', bn: 'বাজার' },
            { id: 'ch5', en: 'Labor Market', bn: 'শ্রম বাজার' },
            { id: 'ch6', en: 'Capital', bn: 'মূলধন' },
            { id: 'ch7', en: 'Organization', bn: 'সংগঠন' },
            { id: 'ch8', en: 'Rent', bn: 'খাজনা' },
            { id: 'ch9', en: 'Overall Income', bn: 'সামগ্রিক আয় ও ব্যয়' },
            { id: 'ch10', en: 'Money & Bank', bn: 'মুদ্রা ও ব্যাংক' }
        ]
    },
    'Civics 1st Paper': {
        en: 'Civics & Good Governance 1st Paper',
        bn: 'পৌরনীতি ও সুশাসন ১ম পত্র',
        chapters: [
            { id: 'ch1', en: 'Introduction', bn: 'পৌরনীতি ও সুশাসন পরিচিতি' },
            { id: 'ch2', en: 'Good Governance', bn: 'সুশাসন' },
            { id: 'ch3', en: 'Values, Law', bn: 'মূল্যবোধ, আইন, স্বাধীনতা ও সাম্য' },
            { id: 'ch4', en: 'E-Governance', bn: 'ই-গভর্ন্যান্স ও সুশাসন' },
            { id: 'ch5', en: 'Rights', bn: 'নাগরিক অধিকার ও কর্তব্য' },
            { id: 'ch6', en: 'Political Parties', bn: 'রাজনৈতিক দল, নেতৃত্ব ও সুশাসন' },
            { id: 'ch7', en: 'Govt Structure', bn: 'সরকার কাঠামো' },
            { id: 'ch8', en: 'Public Opinion', bn: 'জনমত ও রাজনৈতিক সংস্কৃতি' },
            { id: 'ch9', en: 'Bureaucracy', bn: 'জনসেবা ও আমলাতন্ত্র' },
            { id: 'ch10', en: 'Nationalism', bn: 'দেশপ্রেম ও জাতীয়তাবাদ' }
        ]
    },
    'Economics 2nd Paper': {
        en: 'Economics 2nd Paper',
        bn: 'অর্থনীতি ২য় পত্র',
        chapters: [
            { id: 'ch1', en: 'BD Economy', bn: 'বাংলাদেশের অর্থনীতি' },
            { id: 'ch2', en: 'Agriculture', bn: 'কৃষি' },
            { id: 'ch3', en: 'Industry', bn: 'শিল্প' },
            { id: 'ch4', en: 'Population', bn: 'জনসংখ্যা' },
            { id: 'ch5', en: 'Food Security', bn: 'খাদ্য নিরাপত্তা' },
            { id: 'ch6', en: 'Finance', bn: 'অর্থায়ন' },
            { id: 'ch7', en: 'Inflation', bn: 'মুদ্রাস্ফীতি' },
            { id: 'ch8', en: 'Trade', bn: 'বাণিজ্য' },
            { id: 'ch9', en: 'Public Finance', bn: 'সরকারি অর্থব্যবস্থা' },
            { id: 'ch10', en: 'Planning', bn: 'পরিকল্পনা' }
        ]
    },
    'Civics 2nd Paper': {
        en: 'Civics & Good Governance 2nd Paper',
        bn: 'পৌরনীতি ও সুশাসন ২য় পত্র',
        chapters: [
            { id: 'ch1', en: 'British India', bn: 'ব্রিটিশ ভারত' },
            { id: 'ch2', en: 'Pakistan Period', bn: 'পাকিস্তান আমল' },
            { id: 'ch3', en: 'Political Personalities', bn: 'রাজনৈতিক ব্যক্তিত্ব' },
            { id: 'ch4', en: 'Constitution', bn: 'সংবিধান' },
            { id: 'ch5', en: 'Govt Structure', bn: 'সরকার কাঠামো' },
            { id: 'ch6', en: 'Local Govt', bn: 'স্থানীয় শাসন' },
            { id: 'ch7', en: 'Constitutional Organs', bn: 'সাংবিধানিক প্রতিষ্ঠান' },
            { id: 'ch8', en: 'Elections', bn: 'নির্বাচন' },
            { id: 'ch9', en: 'Foreign Policy', bn: 'বৈদেশিক নীতি' },
            { id: 'ch10', en: 'Citizen Problems', bn: 'নাগরিক সমস্যা' }
        ]
    }
};

// ==================== HELPER FUNCTIONS ====================

function isJunior(className) {
    return ['6', '7', '8'].includes(String(className));
}

function isHSC(className) {
    return ['11', '12', '11-12'].includes(String(className));
}

function getSubjects(group, className) {
    const classStr = String(className);

    // Class 6-8: No groups, use JUNIOR_SUBJECTS
    if (isJunior(classStr)) {
        return Object.keys(JUNIOR_SUBJECTS);
    }

    const isHsc = isHSC(classStr);
    let subjects = [];

    // Add Common Subjects
    if (isHsc) {
        subjects = [...Object.keys(HSC_COMMON)];
    } else {
        subjects = [...Object.keys(SSC_COMMON)];
    }

    // Add Group-Specific Subjects (Only for Class 9-12)
    if (group === 'Science') {
        subjects = [...subjects, ...Object.keys(isHsc ? HSC_SCIENCE : SSC_SCIENCE)];
    } else if (group === 'Business Studies') {
        subjects = [...subjects, ...Object.keys(isHsc ? HSC_BUSINESS : SSC_BUSINESS)];
    } else if (group === 'Humanities') {
        subjects = [...subjects, ...Object.keys(isHsc ? HSC_HUMANITIES : SSC_HUMANITIES)];
    }

    return [...new Set(subjects)]; // Remove duplicates
}

function getSubjectData(subjectName, group, className) {
    const classStr = String(className);

    // Class 6-8: Check JUNIOR_SUBJECTS
    if (isJunior(classStr)) {
        if (JUNIOR_SUBJECTS[subjectName]) return JUNIOR_SUBJECTS[subjectName];
    }

    const isHsc = isHSC(classStr);

    // Check Common
    const common = isHsc ? HSC_COMMON : SSC_COMMON;
    if (common[subjectName]) return common[subjectName];

    // Check Group-Specific
    if (group === 'Science') {
        const data = isHsc ? HSC_SCIENCE : SSC_SCIENCE;
        if (data[subjectName]) return data[subjectName];
    } else if (group === 'Business Studies') {
        const data = isHsc ? HSC_BUSINESS : SSC_BUSINESS;
        if (data[subjectName]) return data[subjectName];
    } else if (group === 'Humanities') {
        const data = isHsc ? HSC_HUMANITIES : SSC_HUMANITIES;
        if (data[subjectName]) return data[subjectName];
    }

    return null;
}

function getChapters(subjectName, group, className) {
    const subjectData = getSubjectData(subjectName, group, className);
    return subjectData?.chapters || [];
}

// ==================== EXPORT GLOBAL ====================

if (typeof window !== 'undefined') {
    window.JUNIOR_SUBJECTS = JUNIOR_SUBJECTS;
    window.SSC_COMMON = SSC_COMMON;
    window.SSC_SCIENCE = SSC_SCIENCE;
    window.SSC_BUSINESS = SSC_BUSINESS;
    window.SSC_HUMANITIES = SSC_HUMANITIES;
    window.HSC_COMMON = HSC_COMMON;
    window.HSC_SCIENCE = HSC_SCIENCE;
    window.HSC_BUSINESS = HSC_BUSINESS;
    window.HSC_HUMANITIES = HSC_HUMANITIES;
    window.getSubjects = getSubjects;
    window.getSubjectData = getSubjectData;
    window.getChapters = getChapters;
    window.isJunior = isJunior;
    window.isHSC = isHSC;
}

