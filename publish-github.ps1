[CmdletBinding()]
param(
  [string]$RepoUrl = '',
  [string]$Branch = 'main',
  [string]$UserName = '',
  [string]$UserEmail = '',
  [string]$Message = 'Update Last Tower',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Require-Git {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Git не найден. Установи Git for Windows: https://git-scm.com/download/win'
  }
}

function Get-PagesUrl([string]$url) {
  $path = $url -replace '^https://github\.com/', '' -replace '^git@github\.com:', '' -replace '\.git$', ''
  $path = $path.TrimEnd('/')
  $parts = $path.Split('/')
  if ($parts.Count -lt 2) { return '' }
  if ($parts[1] -eq "$($parts[0]).github.io") { return "https://$($parts[0]).github.io/" }
  return "https://$($parts[0]).github.io/$($parts[1])/"
}

Require-Git

if (-not $RepoUrl) {
  Write-Host ''
  Write-Host 'Создай пустой репозиторий на GitHub (без README, если возможно).' -ForegroundColor Cyan
  Write-Host 'Например: https://github.com/username/last-tower.git' -ForegroundColor DarkGray
  $RepoUrl = Read-Host 'URL репозитория'
}

$RepoUrl = $RepoUrl.Trim()
if ($RepoUrl -notmatch '^(https://github\.com/|git@github\.com:)') {
  throw 'Нужен URL GitHub-репозитория вида https://github.com/USER/REPO.git'
}

if (-not $DryRun) {
  if (-not (Test-Path -LiteralPath '.git')) {
    Write-Host 'Инициализирую локальный git-репозиторий...'
    git init -b $Branch | Out-Host
  }

  $currentBranch = (git branch --show-current).Trim()
  if ($currentBranch -ne $Branch) {
    git checkout -B $Branch | Out-Host
  }

  $gitName = (git config user.name 2>$null)
  if (-not $gitName) {
    if (-not $UserName) { $UserName = Read-Host 'Имя для коммитов (как на GitHub)' }
    git config user.name $UserName
  }
  $gitEmail = (git config user.email 2>$null)
  if (-not $gitEmail) {
    if (-not $UserEmail) { $UserEmail = Read-Host 'Email для коммитов (как на GitHub)' }
    git config user.email $UserEmail
  }

  $remotes = @(git remote 2>$null)
  if ($remotes -contains 'origin') {
    git remote set-url origin $RepoUrl
  } else {
    git remote add origin $RepoUrl
  }
}

$deployFiles = @(
  'index.html',
  'css',
  'js',
  'assets',
  'manifest.webmanifest',
  'sw.js',
  '.nojekyll',
  '.gitignore',
  'README.md',
  'DEMO.md',
  'ENEMIES.md',
  'GITHUB-PAGES.md',
  'screenshots',
  'publish-github.ps1',
  'publish-github.bat'
) | Where-Object { Test-Path -LiteralPath $_ }

if ($DryRun) {
  Write-Host ''
  Write-Host '[dry-run] Будут добавлены:' -ForegroundColor Yellow
  $deployFiles | ForEach-Object { Write-Host "  $_" }
  Write-Host "[dry-run] git add; git commit -m '$Message'; git push -u origin $Branch"
  $pagesUrl = Get-PagesUrl $RepoUrl
  if ($pagesUrl) { Write-Host "GitHub Pages URL: $pagesUrl" }
  exit 0
}

git add -- $deployFiles
$staged = @(git diff --cached --name-only 2>$null)
if ($staged.Count -gt 0) {
  git commit -m $Message | Out-Host
  Write-Host 'Коммит создан.' -ForegroundColor Green
} else {
  Write-Host 'Нет изменений для коммита.' -ForegroundColor DarkGray
}

Write-Host 'Отправляю на GitHub...' -ForegroundColor Cyan
git push -u origin $Branch

$pagesUrl = Get-PagesUrl $RepoUrl
Write-Host ''
Write-Host 'Готово. Осталось включить Pages:' -ForegroundColor Green
Write-Host '  GitHub репозиторий → Settings → Pages'
Write-Host '  Build and deployment → Source: Deploy from a branch'
Write-Host "  Branch: $Branch, Folder: / (root) → Save"
if ($pagesUrl) {
  Write-Host ''
  Write-Host "Сайт: $pagesUrl" -ForegroundColor Cyan
  Write-Host 'Первый запуск Pages может занять 1–2 минуты.'
}
