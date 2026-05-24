@echo off
:: Cria atalho no Desktop apontando para o EduHorarios.vbs (sem janela cmd)
setlocal

set PASTA=%~dp0
set VBS=%PASTA%EduHorarios.vbs
set ATALHO=%USERPROFILE%\Desktop\EduHorários.lnk

:: Usa PowerShell para criar o atalho com ícone do Edge/Chrome
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; ^
   $s = $ws.CreateShortcut('%ATALHO%'); ^
   $s.TargetPath = 'wscript.exe'; ^
   $s.Arguments = '\""%VBS%\"\"'; ^
   $s.WorkingDirectory = '%PASTA%'; ^
   $s.Description = 'EduHorarios - Gestao de Horarios Escolares'; ^
   $s.IconLocation = '%SystemRoot%\System32\shell32.dll,13'; ^
   $s.Save()"

if exist "%ATALHO%" (
    echo.
    echo  Atalho "EduHorarios" criado no seu Desktop com sucesso!
    echo.
) else (
    echo.
    echo  Nao foi possivel criar o atalho automaticamente.
    echo  Crie manualmente um atalho para: %VBS%
    echo.
)
pause
