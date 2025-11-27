"""
Add work_summary and work_report columns to attendances table
Run this script to fix the database schema issue
"""

import pymysql
from app.core.config import settings

def add_attendance_columns():
    """Add missing columns to attendances table"""
    try:
        # Parse database URL
        # Format: mysql+pymysql://user:password@host:port/database
        db_url = settings.DATABASE_URL
        
        # Extract connection details
        if "mysql" in db_url:
            # Remove the mysql+pymysql:// prefix
            db_url = db_url.replace("mysql+pymysql://", "")
            
            # Split user:password@host:port/database
            if "@" in db_url:
                auth, location = db_url.split("@")
                user, password = auth.split(":")
                
                if "/" in location:
                    host_port, database = location.split("/")
                    if ":" in host_port:
                        host, port = host_port.split(":")
                        port = int(port)
                    else:
                        host = host_port
                        port = 3306
                else:
                    host = location
                    port = 3306
                    database = "attendance_db"
            else:
                print("❌ Invalid database URL format")
                return
        else:
            print("❌ Only MySQL databases are supported by this script")
            return
        
        # Connect to database
        print(f"📡 Connecting to database: {host}:{port}/{database}")
        connection = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database
        )
        
        cursor = connection.cursor()
        
        # Check if columns already exist
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = %s 
            AND TABLE_NAME = 'attendances'
            AND COLUMN_NAME IN ('work_summary', 'work_report')
        """, (database,))
        
        existing_columns = [row[0] for row in cursor.fetchall()]
        
        # Add work_summary if it doesn't exist
        if 'work_summary' not in existing_columns:
            print("➕ Adding work_summary column...")
            cursor.execute("""
                ALTER TABLE attendances 
                ADD COLUMN work_summary TEXT NULL
            """)
            print("✅ work_summary column added successfully")
        else:
            print("ℹ️  work_summary column already exists")
        
        # Add work_report if it doesn't exist
        if 'work_report' not in existing_columns:
            print("➕ Adding work_report column...")
            cursor.execute("""
                ALTER TABLE attendances 
                ADD COLUMN work_report VARCHAR(1024) NULL
            """)
            print("✅ work_report column added successfully")
        else:
            print("ℹ️  work_report column already exists")
        
        # Commit changes
        connection.commit()
        
        print("\n✅ Database schema updated successfully!")
        print("You can now delete employees without errors.")
        
        # Close connection
        cursor.close()
        connection.close()
        
    except Exception as e:
        print(f"\n❌ Error updating database: {e}")
        print("\nAlternative: Run the Alembic migration:")
        print("  cd Backend")
        print("  alembic upgrade head")

if __name__ == "__main__":
    print("=" * 60)
    print("Adding Missing Columns to Attendances Table")
    print("=" * 60)
    add_attendance_columns()
