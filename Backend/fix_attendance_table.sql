-- Fix attendances table by adding missing columns
-- Run this SQL script in your MySQL database

-- Add work_summary column if it doesn't exist
ALTER TABLE attendances 
ADD COLUMN IF NOT EXISTS work_summary TEXT NULL;

-- Add work_report column if it doesn't exist
ALTER TABLE attendances 
ADD COLUMN IF NOT EXISTS work_report VARCHAR(1024) NULL;

-- Verify the columns were added
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'attendances'
AND COLUMN_NAME IN ('work_summary', 'work_report');
