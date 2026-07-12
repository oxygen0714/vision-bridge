# Vision Bridge - Minimize Current Window
# Minimizes the calling terminal window so it doesn't appear in screenshots
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File minimize.ps1

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow();
}
"@

$SW_MINIMIZE = 6
$SW_HIDE = 0

# Try to minimize the console window
$console = [Win32]::GetConsoleWindow()
if ($console -ne [IntPtr]::Zero) {
    [Win32]::ShowWindow($console, $SW_MINIMIZE) | Out-Null
}

# Also try the foreground window as fallback
$foreground = [Win32]::GetForegroundWindow()
if ($foreground -ne [IntPtr]::Zero -and $foreground -ne $console) {
    [Win32]::ShowWindow($foreground, $SW_MINIMIZE) | Out-Null
}
