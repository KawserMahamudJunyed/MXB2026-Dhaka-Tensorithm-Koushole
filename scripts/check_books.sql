-- Script to process existing books for chapter extraction
-- Run each book's file_url through the /api/process-book endpoint

-- 1. View all official resources that need processing
SELECT 
    id, 
    title, 
    subject, 
    class_level, 
    file_url,
    (SELECT COUNT(*) FROM book_chapters WHERE resource_id = official_resources.id) as chapter_count
FROM official_resources
ORDER BY created_at DESC;

-- 2. View all library books that need processing
SELECT 
    id, 
    title, 
    file_url,
    index_status,
    (SELECT COUNT(*) FROM book_chapters WHERE library_book_id = library_books.id) as chapter_count
FROM library_books
ORDER BY created_at DESC;
