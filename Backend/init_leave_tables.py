"""
Initialize leave tables in the database
"""
from app.db.database import engine, Base
from app.db.models.user import User
from app.db.models.leave import Leave

def init_leave_tables():
    print("🔄 Creating leave tables...")
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ Leave tables created successfully!")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")

if __name__ == "__main__":
    init_leave_tables()
