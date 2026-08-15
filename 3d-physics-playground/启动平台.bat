@echo off
chcp 65001 >nul
setlocal
set "平台目录=%~dp0"
cd /d "%平台目录%"

where python >nul 2>nul
if errorlevel 1 (
  echo [错误] 没有找到 Python，无法启动本地网页服务。
  echo 请安装 Python 3 后再次双击此文件，或参考 使用说明.md 手动启动。
  pause
  exit /b 1
)

python -c "import socket,sys; s=socket.socket(); s.settimeout(0.5); code=s.connect_ex(('127.0.0.1',8000)); s.close(); sys.exit(1 if code==0 else 0)"
if errorlevel 1 (
  echo [错误] 8000 端口已经被占用。
  echo 请关闭占用该端口的程序后再试，或参考 使用说明.md 使用其他端口手动启动。
  pause
  exit /b 1
)

echo 立体物理乐园运行中；关闭此窗口即可停止本地服务。
echo 正在打开浏览器页面……
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 600; Start-Process 'http://localhost:8000/立体物理游戏平台.html'"
python -m http.server 8000 --bind 127.0.0.1

if errorlevel 1 (
  echo [错误] 本地网页服务启动失败，请查看上面的提示。
  pause
)
endlocal
