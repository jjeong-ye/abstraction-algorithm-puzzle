# 퍼즐 탐험대 · 초경량 정적 웹 서버 (TcpListener 기반, 관리자 권한 불필요)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }
$port = 8123

$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8';
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json; charset=utf-8';
  '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.jpg' = 'image/jpeg';
  '.gif' = 'image/gif'; '.pdf' = 'application/pdf'; '.ico' = 'image/x-icon';
  '.woff' = 'font/woff'; '.woff2' = 'font/woff2'; '.map' = 'application/json';
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $port)
$listener.Start()
Write-Host "==== 퍼즐 탐험대 서버 시작 ===="
Write-Host "주소:  http://localhost:$port/index.html"
Write-Host "테스트: http://localhost:$port/test.html"
Write-Host "종료하려면 이 창을 닫으세요."

function Send-Response($stream, $status, $ctype, [byte[]]$body) {
  $head = "HTTP/1.1 $status`r`nContent-Type: $ctype`r`nContent-Length: $($body.Length)`r`nConnection: close`r`nCache-Control: no-cache`r`n`r`n"
  $hbytes = [System.Text.Encoding]::ASCII.GetBytes($head)
  $stream.Write($hbytes, 0, $hbytes.Length)
  if ($body.Length) { $stream.Write($body, 0, $body.Length) }
  $stream.Flush()
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $line = $reader.ReadLine()
    if (-not $line) { $client.Close(); continue }
    $parts = $line -split ' '
    $rawPath = if ($parts.Count -ge 2) { $parts[1] } else { '/' }
    $rawPath = ($rawPath -split '\?')[0]
    if ($rawPath -eq '/') { $rawPath = '/index.html' }
    $decoded = [System.Uri]::UnescapeDataString($rawPath).TrimStart('/')
    $decoded = $decoded -replace '/', '\'
    $full = Join-Path $root $decoded

    # 디렉터리 탈출 방지
    $fullResolved = [System.IO.Path]::GetFullPath($full)
    if (-not $fullResolved.StartsWith([System.IO.Path]::GetFullPath($root))) {
      Send-Response $stream '403 Forbidden' 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes('403'))
      $client.Close(); continue
    }

    if (Test-Path $fullResolved -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($fullResolved).ToLower()
      $ctype = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $bytes = [System.IO.File]::ReadAllBytes($fullResolved)
      Send-Response $stream '200 OK' $ctype $bytes
      Write-Host "200 $rawPath"
    } else {
      Send-Response $stream '404 Not Found' 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes('404: ' + $decoded))
      Write-Host "404 $rawPath"
    }
  } catch {
    Write-Host "ERR $_"
  } finally {
    $client.Close()
  }
}
