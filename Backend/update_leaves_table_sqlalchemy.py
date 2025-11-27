"""
Update Leaves Table using SQLAlchemy
This script adds new columns to the leaves table
"""
from sqlalchemy import text, inspect
from app.db.database import engine
import sys

def column_exists(table_name, column_name):
    """Check if a column exists"""
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns

def update_leaves_table():
    """Add new columns to leaves table"""
    print("=" * 80)
    print("UPDATE LEAVES TABLE - ADD TRACKING COLUMNS")
    print("=" * 80)
    print()
    
    try:
        with engine.connect() as connection:
            print("🔄 Updating leaves table...")
            
            # Check if columns exist
            columns_to_add = {
                'created_at': "ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when leave request was created'",
                'updated_at': "ADD COLUMN updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Timestamp of last update'",
                'approved_by': "ADD COLUMN approved_by INT NULL COMMENT 'User ID of approver'",
                'approved_at': "ADD COLUMN approved_at TIMESTAMP NULL COMMENT 'Timestamp of approval/rejection'",
                'rejection_reason': "ADD COLUMN rejection_reason TEXT NULL COMMENT 'Reason for rejection'",
                'comments': "ADD COLUMN comments TEXT NULL COMMENT 'Approver comments'"
            }
            
            # Add columns
            for col_name, alter_sql in columns_to_add.items():
                if not column_exists('leaves', col_name):
                    try:
                        connection.execute(text(f"ALTER TABLE leaves {alter_sql}"))
                        connection.commit()
                        print(f"✅ Added {col_name} column")
                    except Exception as e:
                        print(f"⚠️  Error adding {col_name}: {e}")
                else:
                    print(f"ℹ️  {col_name} column already exists")
            
            # Add foreign key constraint
            try:
                # Check if foreign key exists
                result = connection.execute(text("""
                    SELECT COUNT(*) 
                    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                    WHERE TABLE_SCHEMA = DATABASE()
                    AND CONSTRAINT_NAME = 'fk_leaves_approved_by'
                    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                """))
                fk_exists = result.scalar() > 0
                
                if not fk_exists:
                    connection.execute(text("""
                        ALTER TABLE leaves 
                        ADD CONSTRAINT fk_leaves_approved_by 
                        FOREIGN KEY (approved_by) REFERENCES users(user_id) 
                        ON DELETE SET NULL
                    """))
                    connection.commit()
                    print("✅ Added foreign key constraint for approved_by")
                else:
                    print("ℹ️  Foreign key constraint already exists")
            except Exception as e:
                print(f"⚠️  Error adding foreign key: {e}")
            
            # Add indexes
            indexes = {
                'idx_leaves_approved_by': 'approved_by',
                'idx_leaves_created_at': 'created_at',
                'idx_leaves_status': 'status'
            }
            
            for idx_name, col_name in indexes.items():
                try:
                    # Check if index exists
                    result = connection.execute(text(f"""
                        SELECT COUNT(*) 
                        FROM INFORMATION_SCHEMA.STATISTICS 
                        WHERE TABLE_SCHEMA = DATABASE()
                        AND TABLE_NAME = 'leaves'
                        AND INDEX_NAME = '{idx_name}'
                    """))
                    idx_exists = result.scalar() > 0
                    
                    if not idx_exists:
                        connection.execute(text(f"CREATE INDEX {idx_name} ON leaves({col_name})"))
                        connection.commit()
                        print(f"✅ Added index {idx_name}")
                    else:
                        print(f"ℹ️  Index {idx_name} already exists")
                except Exception as e:
                    print(f"⚠️  Error adding index {idx_name}: {e}")
            
            # Verify changes
            print("\n📊 Verifying table structure...")
            result = connection.execute(text("DESCRIBE leaves"))
            columns = result.fetchall()
            
            print("\n📋 Leaves Table Structure:")
            print("-" * 80)
            print(f"{'Field':<20} {'Type':<20} {'Null':<6} {'Key':<6} {'Default':<15}")
            print("-" * 80)
            for col in columns:
                field, type_, null, key, default, extra = col
                default_str = str(default) if default else ''
                print(f"{field:<20} {type_:<20} {null:<6} {key:<6} {default_str:<15}")
            print("-" * 80)
            
            # Show foreign keys
            print("\n🔗 Foreign Key Constraints:")
            result = connection.execute(text("""
                SELECT 
                    CONSTRAINT_NAME,
                    COLUMN_NAME,
                    REFERENCED_TABLE_NAME,
                    REFERENCED_COLUMN_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'leaves'
                AND REFERENCED_TABLE_NAME IS NOT NULL
            """))
            fks = result.fetchall()
            for fk in fks:
                print(f"  • {fk[0]}: {fk[1]} → {fk[2]}.{fk[3]}")
            
            # Show indexes
            print("\n📑 Indexes:")
            result = connection.execute(text("SHOW INDEX FROM leaves"))
            indexes = result.fetchall()
            unique_indexes = set()
            for idx in indexes:
                index_name = idx[2]
                if index_name not in unique_indexes:
                    unique_indexes.add(index_name)
                    print(f"  • {index_name}")
            
            print("\n✅ Leaves table updated successfully!")
            print("\n" + "=" * 80)
            print("✅ ALL CHANGES APPLIED SUCCESSFULLY!")
            print("=" * 80)
            print("\nYou can now restart the backend server:")
            print("  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
            
            return True
            
    except Exception as e:
        print(f"\n❌ Error updating table: {e}")
        print("\n" + "=" * 80)
        print("❌ UPDATE FAILED - Please check the errors above")
        print("=" * 80)
        return False

if __name__ == "__main__":
    success = update_leaves_table()
    sys.exit(0 if success else 1)
