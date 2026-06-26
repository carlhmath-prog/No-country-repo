import os, sqlite3
print('cwd', os.getcwd())
print('exists', os.path.exists('govtech.db'))
if os.path.exists('govtech.db'):
    conn = sqlite3.connect('govtech.db')
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    print('tables', cur.fetchall())
    try:
        cur.execute('SELECT COUNT(*) FROM usuarios')
        print('usuarios count', cur.fetchone()[0])
    except Exception as e:
        print('usuarios error', e)
    conn.close()
