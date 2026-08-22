ALUMNI

{
  "studentNumber": "23-01644",
  "password": "NewPass@123"
}

ADMIN

{
  "username": "admin",
  "password": "Admin@1234"
}

Build

dotnet build

D:
cd D:\CAPSTONE_SYSTEM\MyApp
cls
dotnet run --project MyApp.API

D:
cd D:\CAPSTONE_SYSTEM\alumni-admin
cls
npm run electron:dev

D:
cd D:\CAPSTONE_SYSTEM\alumni-mobile
cls
npx expo start

Note: 10.0.2.2 is the Android emulator's address for localhost on your PC. 
When testing on a real device connected to the same WiFi, replace it with 
your PC's local IP address (e.g. 192.168.1.x).
MyApp.Mobile/Services/ApiService.cs

Desktop 

dotnet run --project MyApp.Desktop

Mobile

dotnet build MyApp.Mobile/MyApp.Mobile.csproj -f net9.0-android -t:Run