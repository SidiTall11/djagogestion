import pymysql

try:
    conn = pymysql.connect(host='127.0.0.1', user='root', password='')
    cursor = conn.cursor()
    cursor.execute('CREATE DATABASE IF NOT EXISTS djago_gestion CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
    print("Database djago_gestion created successfully or already exists.")
except Exception as e:
    print(f"Failed to create database: {e}")
