Option Explicit

Dim fso, sh, dir, nodeExe, viteJs, installCmd

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir

If Not fso.FolderExists(dir & "\node_modules") Then
  ' Installation nur wenn nötig (einmalig)
  installCmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command ""npm.cmd install"""
  sh.Run installCmd, 0, True
End If

nodeExe = Trim(sh.ExpandEnvironmentStrings("%ProgramFiles%\nodejs\node.exe"))
If Not fso.FileExists(nodeExe) Then
  nodeExe = Trim(sh.ExpandEnvironmentStrings("%LOCALAPPDATA%\Programs\nodejs\node.exe"))
End If
If Not fso.FileExists(nodeExe) Then
  MsgBox "Node.js wurde nicht gefunden. Bitte Node.js installieren.", vbExclamation, "React Todo App"
  WScript.Quit 1
End If

viteJs = dir & "\node_modules\vite\bin\vite.js"
If Not fso.FileExists(viteJs) Then
  MsgBox "Vite fehlt. Bitte einmalig im Projektordner 'npm install' ausführen.", vbExclamation, "React Todo App"
  WScript.Quit 1
End If

' Direkt node + vite, Fenster komplett versteckt (kein cmd/npm.cmd)
sh.Run """" & nodeExe & """ """ & viteJs & """", 0, False

WScript.Sleep 2500
sh.Run "http://localhost:5173/", 1, False
