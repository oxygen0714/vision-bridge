@echo off
REM Vision Bridge - Quick see: auto-find latest screenshot and analyze
node "%~dp0vision.mjs" latest "C:\Users\1\Pictures\Screenshots" "详细描述截图里显示了什么？包括所有菜单、按钮、弹窗文字、代码内容、红色波浪线和错误信息"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ 未找到截图。请先按 Win+Shift+S 框选截图。
    pause
)
