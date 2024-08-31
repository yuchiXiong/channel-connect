# Channel Connect

A file transfer tool MVP based PeerJS(WebRTC) and Electron.

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