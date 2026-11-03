@echo off
setlocal
echo ========================================================
echo   CALORIE TRACKER - PUBLISH TO CH PLAY ^& APP STORE
echo ========================================================
echo.

set "PATH=C:\Program Files\Git\cmd;C:\Users\duyng\nodejs;%PATH%"

echo [1/3] Kiem tra phien dang nhap Expo...
call npx --yes eas-cli whoami 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [THONG BAO] Ban chua dang nhap Expo.
    echo Vui long nhap Email va Password Expo khi duoc yeu cau:
    echo (Neu chua co tai khoan, dang ky mien phi tai https://expo.dev)
    echo.
    call npx --yes eas-cli login
    if %errorlevel% neq 0 (
        echo [LOI] Dang nhap Expo that bai. Vui long thu lai!
        pause
        exit /b 1
    )
)

echo.
echo [2/3] Da xac thuc Expo thanh cong!
echo.
echo [3/3] Bat dau tien trinh Build va Tu dong nop len CH Play ^& App Store...
echo Lenh: eas build --platform all --profile production --auto-submit
echo.
call npx --yes eas-cli build --platform all --profile production --auto-submit

echo.
echo ========================================================
echo   HOAN TAT TIEN TRINH BUILD ^& SUBMIT!
echo ========================================================
pause
