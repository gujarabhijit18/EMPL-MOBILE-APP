"""
Add tracking columns to leaves table
"""
import sqlite3
from datetime import datetime

def add_leave_tracking_columns():
    conn = sqlite3.connect('attendance.db')
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(leaves)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Add created_at column
        if 'created_at' not in columns:
            cursor.execute("""
                ALTER TABLE leaves 
                ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            """)
            print("✅ Added created_at column")
        
        # Add updated_at column
        if 'updated_at' not in columns:
            cursor.execute("""
                ALTER TABLE leaves 
                ADD COLUMN updated_at TIMESTAMP
            """)
            print("✅ Added updated_at column")
        
        # Add approved_by column
        if 'approved_by' not in columns:
            cursor.execute("""
                ALTER TABLE leaves 
                ADD COLUMN approved_by INTEGER
            """)
            print("✅ Added approved_by column")
        
        # Add approved_at column
        if 'approved_at' not in columns:
            cursor.execute("""
                ALTER TABLE leaves 
                ADD COLUMN approved_at TIMESTAMP
            """)
            print("✅ Added approved_at column")
        
        # Add rejection_reason column
        if 'rejection_reason' not in columns:
            cursor.execute("""
                ALTER TABLE leaves 
                ADD COLUMN rejection_reason TEXT
            """)
            print("✅ Added rejection_reason column")
        
        # Add comments column
        if 'comments' not in columns:
            cursor.execute("""
                ALTER TABLE leaves 
                ADD COLUMN comments TEXT
            """)
            print("✅ Added comments column")
        
        conn.commit()
        print("\n✅ All leave tracking columns added successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_leave_tracking_columns()
