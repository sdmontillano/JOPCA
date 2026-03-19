@echo off
setlocal
pushd "%~dp0"

if not exist "%~dp0logs" mkdir "%~dp0logs"

:: Start Django hidden using pythonw and log output
start "" /B "C:\Users\DELL\AppData\Local\Programs\Python\Python313\pythonw.exe" "%~dp0banking_dcpr\manage.py" runserver 127.0.0.1:8000 > "%~dp0logs\django.log" 2>&1

:: Start frontend in background and log output
start "" /B cmd /c "cd /d "%~dp0frontend_admin" && npm.cmd run dev > "%~dp0logs\frontend.log" 2>&1"

:: Wait for ports to be ready
powershell -NoProfile -Command ^
  "try { ^
     $ok = $false; $tries=0; ^
     while(-not $ok -and $tries -lt 12) { ^
       $f = (Test-NetConnection -ComputerName '127.0.0.1' -Port 5173).TcpTestSucceeded; ^
       $b = (Test-NetConnection -ComputerName '127.0.0.1' -Port 8000).TcpTestSucceeded; ^
       if($f -and $b) { $ok = $true; break } ^
       Start-Sleep -Seconds 1; $tries++ ^
     }; ^
   } catch {}"

:: Open browser
start "" "http://localhost:5173/login"

popd
endlocal
exit