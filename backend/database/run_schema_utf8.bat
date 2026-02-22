@echo off
chcp 65001 >nul
set PGPASSWORD=
echo Запуск schema.sql (UTF-8). Введите пароль postgres при запросе.
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d hero_memorial -f "%~dp0schema.sql"
pause
