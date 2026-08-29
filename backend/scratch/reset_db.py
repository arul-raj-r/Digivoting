import psycopg2

DATABASE_URL = "postgresql://postgres.zfemrdmuscznkxzecbyz:arulvarsh2403@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

try:
    print("Connecting to Supabase PostgreSQL...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    with conn.cursor() as cursor:
        print("Resetting public schema (dropping and creating clean schema)...")
        cursor.execute("DROP SCHEMA public CASCADE;")
        cursor.execute("CREATE SCHEMA public;")
        cursor.execute("GRANT ALL ON SCHEMA public TO postgres;")
        cursor.execute("GRANT ALL ON SCHEMA public TO public;")
    print("Supabase PostgreSQL database reset successfully!")
except Exception as e:
    print(f"Error resetting database: {e}")
