# Vision Bridge - Clipboard Image Reader
# Saves the current clipboard image to a file
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File clipboard.ps1 [-Output path]
param(
    [string]$Output = ""
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

try {
    if (-not [System.Windows.Forms.Clipboard]::ContainsImage()) {
        Write-Error "CLIPBOARD_EMPTY"
        exit 1
    }

    $img = [System.Windows.Forms.Clipboard]::GetImage()
    if ($null -eq $img) {
        Write-Error "CLIPBOARD_EMPTY"
        exit 1
    }

    if ($Output -eq "") {
        $timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
        $Output = Join-Path (Get-Location) "clipboard_${timestamp}.png"
    }

    $img.Save($Output, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output $Output
} catch {
    Write-Error "CLIPBOARD_ERROR: $_"
    exit 1
}
