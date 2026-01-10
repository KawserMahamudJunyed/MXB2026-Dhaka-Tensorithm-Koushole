-- Fix specific book version (Change to Bangla)
UPDATE official_resources 
SET version = 'bangla',
    title = REPLACE(title, '(English Version)', '(Bangla Medium)') -- Also fix title if it has the wrong suffix
WHERE id = '47e3ee92-5af2-48e3-87fe-d0dd72f817fe';

-- Verify the change
SELECT id, title, version FROM official_resources WHERE id = '47e3ee92-5af2-48e3-87fe-d0dd72f817fe';
