-- =====================================================
-- AUTO-TRANSLATE BANGLA BOOK TITLES
-- =====================================================
-- This creates a trigger that automatically translates 
-- book titles to Bangla when version='bangla'
-- =====================================================

-- Step 1: Create a translation mapping table
CREATE TABLE IF NOT EXISTS subject_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    english_term TEXT UNIQUE NOT NULL,
    bangla_term TEXT NOT NULL
);

-- Insert common NCTB subject translations
INSERT INTO subject_translations (english_term, bangla_term) VALUES
    ('Mathematics', 'গণিত'),
    ('Math', 'গণিত'),
    ('General Mathematics', 'সাধারণ গণিত'),
    ('Higher Mathematics', 'উচ্চতর গণিত'),
    ('Higher Math', 'উচ্চতর গণিত'),
    ('Science', 'বিজ্ঞান'),
    ('General Science', 'সাধারণ বিজ্ঞান'),
    ('Physics', 'পদার্থবিজ্ঞান'),
    ('Chemistry', 'রসায়ন'),
    ('Biology', 'জীববিজ্ঞান'),
    ('English', 'ইংরেজি'),
    ('English 1st Paper', 'ইংরেজি ১ম পত্র'),
    ('English 2nd Paper', 'ইংরেজি ২য় পত্র'),
    ('Bangla', 'বাংলা'),
    ('Bangla 1st Paper', 'বাংলা ১ম পত্র'),
    ('Bangla 2nd Paper', 'বাংলা ২য় পত্র'),
    ('ICT', 'তথ্য ও যোগাযোগ প্রযুক্তি'),
    ('Information and Communication Technology', 'তথ্য ও যোগাযোগ প্রযুক্তি'),
    ('Bangladesh and Global Studies', 'বাংলাদেশ ও বিশ্বপরিচয়'),
    ('Bangladesh & Global Studies', 'বাংলাদেশ ও বিশ্বপরিচয়'),
    ('History', 'ইতিহাস'),
    ('Geography', 'ভূগোল'),
    ('Economics', 'অর্থনীতি'),
    ('Civics', 'পৌরনীতি'),
    ('Civics and Citizenship', 'পৌরনীতি ও নাগরিকতা'),
    ('Accounting', 'হিসাববিজ্ঞান'),
    ('Finance', 'ফিন্যান্স ও ব্যাংকিং'),
    ('Finance and Banking', 'ফিন্যান্স ও ব্যাংকিং'),
    ('Business Entrepreneurship', 'ব্যবসায় উদ্যোগ'),
    ('Agriculture', 'কৃষি শিক্ষা'),
    ('Home Science', 'গার্হস্থ্য বিজ্ঞান'),
    ('Religion', 'ধর্ম'),
    ('Islam', 'ইসলাম শিক্ষা'),
    ('Islam and Moral Education', 'ইসলাম ও নৈতিক শিক্ষা'),
    ('Hindu Religion', 'হিন্দুধর্ম শিক্ষা'),
    ('Buddhist Religion', 'বৌদ্ধধর্ম শিক্ষা'),
    ('Christian Religion', 'খ্রিষ্টধর্ম শিক্ষা'),
    ('Arts and Crafts', 'চারু ও কারুকলা'),
    ('Physical Education', 'শারীরিক শিক্ষা'),
    ('Introduction', 'ভূমিকা'),
    ('Class', 'শ্রেণি')
ON CONFLICT (english_term) DO UPDATE SET bangla_term = EXCLUDED.bangla_term;

-- Class number translations
INSERT INTO subject_translations (english_term, bangla_term) VALUES
    ('Class 6', '৬ষ্ঠ শ্রেণি'),
    ('Class 7', '৭ম শ্রেণি'),
    ('Class 8', '৮ম শ্রেণি'),
    ('Class 9', '৯ম শ্রেণি'),
    ('Class 10', '১০ম শ্রেণি'),
    ('Class 9-10', '৯ম-১০ম শ্রেণি'),
    ('Class 11', '১১শ শ্রেণি'),
    ('Class 12', '১২শ শ্রেণি'),
    ('Class 11-12', '১১শ-১২শ শ্রেণি')
ON CONFLICT (english_term) DO UPDATE SET bangla_term = EXCLUDED.bangla_term;

-- Part/Volume translations
INSERT INTO subject_translations (english_term, bangla_term) VALUES
    ('Part 1', '১ম খণ্ড'),
    ('Part 2', '২য় খণ্ড'),
    ('Part 3', '৩য় খণ্ড'),
    ('Part 4', '৪র্থ খণ্ড'),
    ('Part 5', '৫ম খণ্ড'),
    ('Volume 1', '১ম খণ্ড'),
    ('Volume 2', '২য় খণ্ড')
ON CONFLICT (english_term) DO UPDATE SET bangla_term = EXCLUDED.bangla_term;

-- Medium and Version translations
INSERT INTO subject_translations (english_term, bangla_term) VALUES
    ('(Bangla Medium)', '(বাংলা মাধ্যম)'),
    ('(English Medium)', '(ইংরেজি মাধ্যম)'),
    ('(English Version)', '(ইংরেজি সংস্করণ)'),
    ('(Bangla Version)', '(বাংলা সংস্করণ)'),
    ('Bangla Medium', 'বাংলা মাধ্যম'),
    ('English Medium', 'ইংরেজি মাধ্যম'),
    ('English Version', 'ইংরেজি সংস্করণ'),
    ('Bangla Version', 'বাংলা সংস্করণ'),
    ('Medium', 'মাধ্যম'),
    ('Version', 'সংস্করণ')
ON CONFLICT (english_term) DO UPDATE SET bangla_term = EXCLUDED.bangla_term;

-- Subject group tags
INSERT INTO subject_translations (english_term, bangla_term) VALUES
    ('[Science]', '[বিজ্ঞান]'),
    ('[Humanities]', '[মানবিক]'),
    ('[Business Studies]', '[ব্যবসায় শিক্ষা]'),
    ('[Commerce]', '[বাণিজ্য]'),
    ('[Common]', '[সাধারণ]'),
    ('[Optional]', '[ঐচ্ছিক]')
ON CONFLICT (english_term) DO UPDATE SET bangla_term = EXCLUDED.bangla_term;

-- Paper number translations  
INSERT INTO subject_translations (english_term, bangla_term) VALUES
    ('1st Paper', '১ম পত্র'),
    ('2nd Paper', '২য় পত্র'),
    ('First Paper', '১ম পত্র'),
    ('Second Paper', '২য় পত্র')
ON CONFLICT (english_term) DO UPDATE SET bangla_term = EXCLUDED.bangla_term;

-- Step 2: Create translation function
CREATE OR REPLACE FUNCTION translate_to_bangla(english_title TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
    term RECORD;
BEGIN
    result := english_title;
    
    -- Replace each English term with Bangla
    FOR term IN SELECT english_term, bangla_term FROM subject_translations ORDER BY LENGTH(english_term) DESC
    LOOP
        result := REPLACE(result, term.english_term, term.bangla_term);
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger function for auto-translation
CREATE OR REPLACE FUNCTION auto_translate_bangla_title()
RETURNS TRIGGER AS $$
BEGIN
    -- Only translate if version is 'bangla' and title_bn is empty
    IF NEW.version = 'bangla' AND (NEW.title_bn IS NULL OR NEW.title_bn = '') THEN
        NEW.title_bn := translate_to_bangla(NEW.title);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Add title_bn column if it doesn't exist
ALTER TABLE official_resources 
ADD COLUMN IF NOT EXISTS title_bn TEXT;

-- Step 5: Create trigger on INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_translate_bangla ON official_resources;
CREATE TRIGGER trigger_translate_bangla
    BEFORE INSERT OR UPDATE ON official_resources
    FOR EACH ROW
    EXECUTE FUNCTION auto_translate_bangla_title();

-- Step 6: Update existing Bangla books with translations
UPDATE official_resources
SET title_bn = translate_to_bangla(title)
WHERE version = 'bangla' AND (title_bn IS NULL OR title_bn = '');

-- Verify the updates
SELECT id, title, title_bn, version, class_level
FROM official_resources
WHERE version = 'bangla'
ORDER BY class_level, title;

-- =====================================================
-- DATA FIX: Rename "General Mathematics" to "Mathematics" for 9-10
-- =====================================================

-- Fix English titles: General Mathematics → Mathematics for Class 9-10
UPDATE official_resources
SET title = REPLACE(title, 'General Mathematics', 'Mathematics')
WHERE class_level IN ('9', '10', '9-10') 
  AND title LIKE '%General Mathematics%';

-- Fix Bangla titles: সাধারণ গণিত → গণিত for Class 9-10
UPDATE official_resources
SET title_bn = REPLACE(title_bn, 'সাধারণ গণিত', 'গণিত')
WHERE class_level IN ('9', '10', '9-10') 
  AND title_bn LIKE '%সাধারণ গণিত%';

-- Also update the translation mapping: For 9-10, General Mathematics should become গণিত
-- (This is a one-time fix, the trigger will use the updated titles going forward)

-- Re-translate all Bangla books to apply the fix
UPDATE official_resources
SET title_bn = translate_to_bangla(title)
WHERE version = 'bangla';

-- =====================================================
-- DONE! Now whenever you add a new book with version='bangla',
-- the title will automatically be translated to Bangla.
-- =====================================================
