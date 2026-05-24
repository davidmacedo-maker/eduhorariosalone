@echo off
setlocal

set URL=https://b1db7b98-c469-4235-b318-2be891446309-00-1ogjefz937f7e.picard.replit.dev

:: Tenta Chrome em modo app
set CHROME1=%ProgramFiles%\Google\Chrome\Application\chrome.exe
set CHROME2=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe
set CHROME3=%LocalAppData%\Google\Chrome\Application\chrome.exe

if exist "%CHROME1%" (
    start "" "%CHROME1%" --app=%URL% --window-size=1280,800
    goto :eof
)
if exist "%CHROME2%" (
    start "" "%CHROME2%" --app=%URL% --window-size=1280,800
    goto :eof
)
if exist "%CHROME3%" (
    start "" "%CHROME3%" --app=%URL% --window-size=1280,800
    goto :eof
)

:: Tenta Edge em modo app
set EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe
set EDGE2=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe

if exist "%EDGE%" (
    start "" "%EDGE%" --app=%URL% --window-size=1280,800
    goto :eof
)
if exist "%EDGE2%" (
    start "" "%EDGE2%" --app=%URL% --window-size=1280,800
    goto :eof
)

:: Fallback: abre no browser padrão
start "" %URL%

endlocal
