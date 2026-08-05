import pymysql
from pymysql.cursors import DictCursor
from config.settings import Config

def get_db_ai_connection():
    """
    // ISI DISINI UNTUK LOGIC KONEKSI DB KHUSUS AI (mewah_security_ai)
    """
    return pymysql.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME_AI,
        cursorclass=DictCursor,
        autocommit=True
    )

def get_db_general_connection():
    """
    // ISI DISINI UNTUK LOGIC READ-ONLY KONEKSI DB SCADA UMUM (mewah_security)
    """
    return pymysql.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME_GENERAL,
        cursorclass=DictCursor,
        autocommit=True
    )
