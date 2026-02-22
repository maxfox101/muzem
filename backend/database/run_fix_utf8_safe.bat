@echo off
chcp 65001 >nul
echo Исправление кодировки справочников (звания, населённые пункты, места службы)...
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d hero_memorial -f "%~dp0002_fix_dictionaries_utf8_safe.sql"
echo Готово. Обновите страницу в браузере.
pause
