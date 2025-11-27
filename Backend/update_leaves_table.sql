-- =====================================================
-- Update Leaves Table - Add Tracking Columns
-- =====================================================
-- This script adds new columns to the leaves table for
-- better tracking of leave requests and approvals
-- =====================================================

USE empl;

-- Add created_at column (timestamp when leave was requested)
ALTER TABLE leaves 
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
COMMENT 'Timestamp when leave request was created';

-- Add updated_at column (timestamp of last modification)
ALTER TABLE leaves 
ADD COLUMN updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
COMMENT 'Timestamp of last update to leave request';

-- Add approved_by column (user_id of approver)
ALTER TABLE leaves 
ADD COLUMN approved_by INT NULL
COMMENT 'User ID of the person who approved/rejected the leave';

-- Add foreign key constraint for approved_by
ALTER TABLE leaves 
ADD CONSTRAINT fk_leaves_approved_by 
FOREIGN KEY (approved_by) REFERENCES users(user_id) 
ON DELETE SET NULL
COMMENT 'Foreign key to users table for approver';

-- Add approved_at column (timestamp of approval/rejection)
ALTER TABLE leaves 
ADD COLUMN approved_at TIMESTAMP NULL
COMMENT 'Timestamp when leave was approved or rejected';

-- Add rejection_reason column (reason for rejection)
ALTER TABLE leaves 
ADD COLUMN rejection_reason TEXT NULL
COMMENT 'Reason provided when leave is rejected';

-- Add comments column (approver comments)
ALTER TABLE leaves 
ADD COLUMN comments TEXT NULL
COMMENT 'Comments from approver when approving leave';

-- Add index on approved_by for faster queries
CREATE INDEX idx_leaves_approved_by ON leaves(approved_by);

-- Add index on created_at for sorting
CREATE INDEX idx_leaves_created_at ON leaves(created_at);

-- Add index on status for filtering
CREATE INDEX idx_leaves_status ON leaves(status);

-- Verify the changes
DESCRIBE leaves;

-- Show sample data structure
SELECT 
    leave_id,
    user_id,
    start_date,
    end_date,
    status,
    leave_type,
    created_at,
    approved_by,
    approved_at
FROM leaves 
LIMIT 5;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check if all columns exist
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'empl'
AND TABLE_NAME = 'leaves'
ORDER BY ORDINAL_POSITION;

-- Check foreign key constraints
SELECT 
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'empl'
AND TABLE_NAME = 'leaves'
AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Check indexes
SHOW INDEX FROM leaves;

-- =====================================================
-- Rollback Script (if needed)
-- =====================================================
/*
-- Uncomment to rollback changes

-- Drop indexes
DROP INDEX idx_leaves_approved_by ON leaves;
DROP INDEX idx_leaves_created_at ON leaves;
DROP INDEX idx_leaves_status ON leaves;

-- Drop foreign key
ALTER TABLE leaves DROP FOREIGN KEY fk_leaves_approved_by;

-- Drop columns
ALTER TABLE leaves DROP COLUMN comments;
ALTER TABLE leaves DROP COLUMN rejection_reason;
ALTER TABLE leaves DROP COLUMN approved_at;
ALTER TABLE leaves DROP COLUMN approved_by;
ALTER TABLE leaves DROP COLUMN updated_at;
ALTER TABLE leaves DROP COLUMN created_at;
*/

-- =====================================================
-- Success Message
-- =====================================================
SELECT '✅ Leaves table updated successfully!' AS Status;
