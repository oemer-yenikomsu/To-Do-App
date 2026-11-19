Option Explicit

Dim sh, cmd
Set sh = CreateObject("WScript.Shell")

cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command " & _
  """Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | " & _
  "ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"""

sh.Run cmd, 0, True
