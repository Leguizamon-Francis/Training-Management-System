@echo off
rem Abre el sistema: levanta backend y frontend, y despues el navegador.
rem Para cerrarlo, cerrar las dos ventanas negras.
start "Backend" /d "%~dp0backend" cmd /k npm run dev
start "Frontend" /d "%~dp0frontend" cmd /k npm run dev
timeout /t 6 /nobreak >nul
start "" http://localhost:5173
