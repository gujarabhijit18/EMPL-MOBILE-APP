"""Verify that attendance columns exist"""
import pymysql

try:
    conn = pymysql.connect(
        host='localhost',
        user='root',
        password='',
        database='empl'
    )
    cursor = conn.cursor()
    cursor.execute("SHOW COLUMNS FROM attendances WHERE Field IN ('work_summary', 'work_report')")
    columns = cursor.fetchall()
    
    print("\n✅ Attendance table columns:")
    for col in columns:
        print(f"  - {col[0]}: {col[1]}")
    
    if len(columns) == 2:
        print("\n✅ Both columns exist! Delete functionality should work now.")
    else:
        print(f"\n⚠️  Only {len(columns)} column(s) found. Expected 2.")
    
    conn.close()
except Exception as e:
    print(f"❌ Error: {e}")
