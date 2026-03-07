---
description: Stop the development servers (Laravel and Vite) by killing processes on ports 8000 and 5173
---

// turbo-all
1. Stop the Laravel server (Port 8000)
```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess -ErrorAction SilentlyContinue
```

2. Stop the Vite server (Port 5173)
```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess -ErrorAction SilentlyContinue
```

3. Confirm shutdown
```powershell
echo "Servers stopped."
```
