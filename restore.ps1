# 瞌睡虫V5 版本恢复脚本
# 用法: powershell -ExecutionPolicy Bypass -File "d:\AA趋势分析\restore.ps1"

$workDir = "d:\AA趋势分析"
Set-Location $workDir

Write-Host ""
Write-Host "===== 瞌睡虫V5 版本恢复工具 =====" -ForegroundColor Cyan
Write-Host ""

# 列出所有备份文件（按时间倒序）
$backups = Get-ChildItem -Path $workDir -Filter "index_backup_*.html" | Sort-Object LastWriteTime -Descending

if ($backups.Count -eq 0) {
    Write-Host "❌ 未找到任何备份文件" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit
}

Write-Host "可用的备份版本:" -ForegroundColor Yellow
Write-Host ""

for ($i = 0; $i -lt $backups.Count; $i++) {
    $b = $backups[$i]
    $sizeKB = [math]::Round($b.Length / 1024, 1)
    $time = $b.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
    Write-Host ("  [{0}] {1}  ({2} KB)  {3}" -f ($i + 1), $b.Name, $sizeKB, $time) -ForegroundColor Green
}

Write-Host ""
$choice = Read-Host "请输入要恢复的版本编号 (1-$($backups.Count))，或按 Q 退出"

if ($choice -eq 'Q' -or $choice -eq 'q') {
    Write-Host "已取消恢复" -ForegroundColor Yellow
    exit
}

$index = [int]$choice - 1
if ($index -lt 0 -or $index -ge $backups.Count) {
    Write-Host "❌ 无效的编号" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit
}

$target = $backups[$index]
$currentBackup = "index_backup_current_$(Get-Date -Format 'yyyyMMdd_HHmmss').html"

Write-Host ""
Write-Host "即将恢复: $($target.Name)" -ForegroundColor Cyan
$confirm = Read-Host "确认恢复? (Y/N)"

if ($confirm -ne 'Y' -and $confirm -ne 'y') {
    Write-Host "已取消恢复" -ForegroundColor Yellow
    exit
}

# 先备份当前版本
Copy-Item -Path "index.html" -Destination $currentBackup -Force
Write-Host "✓ 当前版本已备份为: $currentBackup" -ForegroundColor Green

# 恢复选择的版本
Copy-Item -Path $target.FullName -Destination "index.html" -Force
Write-Host "✓ 已恢复到: $($target.Name)" -ForegroundColor Green
Write-Host ""
Write-Host "请刷新浏览器查看效果" -ForegroundColor Cyan
Read-Host "按回车键退出"
