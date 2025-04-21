import sqlite3


# Создание БД для работы приложения
conn = sqlite3.connect('packing_results.db')
cur = conn.cursor()

cur.execute('''
CREATE TABLE IF NOT EXISTS packing_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    parameters TEXT,
    result_json TEXT
)
''')

conn.commit()
conn.close()
print("База данных и таблица успешно созданы.")
