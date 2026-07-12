# Vision Bridge Screenshot Helper
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File screenshot.ps1 [-Output path]
param(
    [string]$Output = "screenshot.png"
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$w = $screen.Bounds.Width
$h = $screen.Bounds.Height
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen(0, 0, 0, 0, $bmp.Size)
$bmp.Save($Output, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

Write-Output $Output
