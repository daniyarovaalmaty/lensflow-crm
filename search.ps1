Get-ChildItem -Path src -Recurse -Include *.tsx,*.ts | Select-String -Pattern 'permissions' -List | ForEach-Object { $_.Path }
