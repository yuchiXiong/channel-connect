<div align="center">
  <img src="./packages/core/icons/icon_128x128@2x.png" alt="Logo" />
  <hr />
  <h3>A file transfer tool MVP based PeerJS(WebRTC) and Electron.</h3>

  https://github.com/user-attachments/assets/fffc888d-027e-464c-8ef2-7722dcd79bf6
</div>

<br />

## Features
- [x] file transfer by PeerJS

## Build

### Build Mobile
```shell
# android
cd ./packages/mobile

# install dependencies
flutter pub get

# generate icons
flutter pub run flutter_launcher_icons

# build apk
flutter build apk --split-per-abi

# todo: IOS
```

### Build Desktop
```shell
cd ./packages/desktop

npm i

npm run make
```

## Development

### Start Server

```shell
cd ./packages/server

pnpm i

pnpm run start
```

Check it: http://127.0.0.1:9000/myapp It should returns JSON with name, description and website fields.

### Start Web

```shell
cd ./packages/web

pnpm i

pnpm run dev
```

### start Electron Client

```shell
cd ./packages/core

pnpm i

pnpm run start
```

### Start Mobile App

```shell
cd ./packages/mobile

flutter pub get

flutter run
```
