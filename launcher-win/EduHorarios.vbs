' EduHorários Launcher — abre sem janela de cmd piscando
Set oShell = CreateObject("WScript.Shell")
Dim sBat
sBat = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\")) & "EduHorarios.bat"
oShell.Run Chr(34) & sBat & Chr(34), 0, False
