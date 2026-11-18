@echo off
rem Daily price refresh from korzinka.uz and olx.uz (registered in Windows Task Scheduler as "BozorAnalitika price scrape").
rem Output is appended to backend\logs\scrape.log.
cd /d "%~dp0.."
if not exist logs mkdir logs
set PYTHONIOENCODING=utf-8
echo ==== %date% %time% ==== >> logs\scrape.log
".venv\Scripts\python.exe" -m scripts.scrape >> logs\scrape.log 2>&1
echo exit code %errorlevel% >> logs\scrape.log
