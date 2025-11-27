"""
Update Leaves Table - Add Tracking Columns
This script adds new columns to the leaves table for better tracking
"""
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_db_connection():
    """Create database connection"""
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'empl')
        )
        return connection
    except Error as e:
        print(f"❌ Error connecting to database: {e}")
        return None

def column_exists(cursor, table_name, column_name):
    """Check if a column exists in a table"""
    cursor.execute(f"""
        SELECT COUNT(*) 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '{table_name}'
        AND COLUMN_NAME = '{column_name}'
    """)
    return cursor.fetchone()[0] > 0

def index_exists(cursor, table_name, index_name):
    """Check if an index exists"""
    cursor.execute(f"""
        SELECT COUNT(*) 
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '{table_name}'
        AND INDEX_NAME = '{index_name}'
    """)
    return cursor.fetchone()[0] > 0

def foreign_key_exists(cursor, constraint_name):
    """Check if a foreign key constraint exists"""
    cursor.execute(f"""
        SELECT COUNT(*) 
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND CONSTRAINT_NAME = '{constraint_name}'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    """)
    return cursor.fetchone()[0] > 0

def update_leaves_table():
    """Add new columns to leaves table"""
    connection = get_db_connection()
    if not connection:
        return False
    
    try:
        cursor = connection.cursor()
        print("🔄 Updating leaves table...")
        
        # 1. Add created_at column
        if not column_exists(cursor, 'leaves', 'created_at'):
            cursor.execute("""
                ALTER TABLE leaves 
                ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                COMMENT 'Timestamp when leave request was created'
            """)
            print("✅ Added created_at column")
        else:
            print("ℹ️  created_at column already exists")
        
        # 2. Add updated_at column
        if not column_exists(cursor, 'leaves', 'updated_at'):
            cursor.execute("""
                ALTER TABLE leaves 
                ADD COLUMN updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
                COMMENT 'Timestamp of last update'
            """)
            print("✅ Added updated_at column")
        else:
            print("ℹ️  updated_at column already exists")
        
        # 3. Add approved_by column
        if not column_exists(cursor, 'leaves', 'approved_by'):
            cursor.execute("""
                ALTER TABLE leaves 
                ADD COLUMN approved_by INT NULL
                COMMENT 'User ID of approver'
            """)
            print("✅ Added approved_by column")
        else:
            print("ℹ️  approved_by column already exists")
        
        # 4. Add foreign key constraint for approved_by
        if not foreign_key_exists(cursor, 'fk_leaves_approved_by'):
            cursor.execute("""
                ALTER TABLE leaves 
                ADD CONSTRAINT fk_leaves_approved_by 
                FOREIGN KEY (approved_by) REFERENCES users(user_id) 
                ON DELETE SET NULL
            """)
            print("✅ Added foreign key constraint for approved_by")
        else:
            print("ℹ️  Foreign key constraint already exists")
        
        # 5. Add approved_at column
        if not column_exists(cursor, 'leaves', 'approved_at'):
            cursor.execute("""
                ALTER TABLE leaves 
                ADD COLUMN approved_at TIMESTAMP NULL
                COMMENT 'Timestamp of approval/rejection'
            """)
            print("✅ Added approved_at column")
        else:
            print("ℹ️  approved_at column already exists")
        
        # 6. Add rejection_reason column
        if not column_exists(cursor, 'leaves', 'rejection_reason'):
            cursor.execute("""
                ALTER TABLE leaves 
                ADD COLUMN rejection_reason TEXT NULL
                COMMENT 'Reason for rejection'
            """)
            print("✅ Added rejection_reason column")
        else:
            print("ℹ️  rejection_reason column already exists")
        
        # 7. Add comments column
        if not column_exists(cursor, 'leaves', 'comments'):
            cursor.execute("""
                ALTER TABLE leaves 
                ADD COLUMN comments TEXT NULL
                COMMENT 'Approver comments'
            """)
            print("✅ Added comments column")
        else:
            print("ℹ️  comments column already exists")
        
        # 8. Add indexes
        if not index_exists(cursor, 'leaves', 'idx_leaves_approved_by'):
            cursor.execute("CREATE INDEX idx_leaves_approved_by ON leaves(approved_by)")
            print("✅ Added index on approved_by")
        else:
            print("ℹ️  Index on approved_by already exists")
        
        if not index_exists(cursor, 'leaves', 'idx_leaves_created_at'):
            cursor.execute("CREATE INDEX idx_leaves_created_at ON leaves(created_at)")
            print("✅ Added index on created_at")
        else:
            print("ℹ️  Index on created_at already exists")
        
        if not index_exists(cursor, 'leaves', 'idx_leaves_status'):
            cursor.execute("CREATE INDEX idx_leaves_status ON leaves(status)")
            print("✅ Added index on status")
        else:
            print("ℹ️  Index on status already exists")
        
        # Commit changes
        connection.commit()
        
        # Verify changes
        print("\n📊 Verifying table structure...")
        cursor.execute("DESCRIBE leaves")
        columns = cursor.fetchall()
        
        print("\n📋 Leaves Table Structure:")
        print("-" * 80)
        print(f"{'Field':<20} {'Type':<20} {'Null':<6} {'Key':<6} {'Default':<15}")
        print("-" * 80)
        for col in columns:
            field, type_, null, key, default, extra = col
            print(f"{field:<20} {type_:<20} {null:<6} {key:<6} {str(default):<15}")
        print("-" * 80)
        
        # Show foreign keys
        print("\n🔗 Foreign Key Constraints:")
        cursor.execute("""
            SELECT 
                CONSTRAINT_NAME,
                COLUMN_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'leaves'
            AND REFERENCED_TABLE_NAME IS NOT NULL
        """)
        fks = cursor.fetchall()
        for fk in fks:
            print(f"  • {fk[0]}: {fk[1]} → {fk[2]}.{fk[3]}")
        
        # Show indexes
        print("\n📑 Indexes:")
        cursor.execute("SHOW INDEX FROM leaves")
        indexes = cursor.fetchall()
        unique_indexes = set()
        for idx in indexes:
            index_name = idx[2]
            if index_name not in unique_indexes:
                unique_indexes.add(index_name)
                print(f"  • {index_name}")
        
        print("\n✅ Leaves table updated successfully!")
        return True
        
    except Error as e:
        print(f"❌ Error updating table: {e}")
        connection.rollback()
        return False
        
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()
            print("\n🔌 Database connection closed")

if __name__ == "__main__":
    print("=" * 80)
    print("UPDATE LEAVES TABLE - ADD TRACKING COLUMNS")
    print("=" * 80)
    print()
    
    success = update_leaves_table()
    
    if success:
        print("\n" + "=" * 80)
        print("✅ ALL CHANGES APPLIED SUCCESSFULLY!")
        print("=" * 80)
        print("\nYou can now restart the backend server:")
        print("  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    else:
        print("\n" + "=" * 80)
        print("❌ UPDATE FAILED - Please check the errors above")
        print("=" * 80)
