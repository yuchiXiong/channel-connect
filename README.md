<div align="center">
  <img src="./packages/core/icons/icon.ico" alt="Logo" />
  <hr />
  <h3>A file transfer tool MVP based PeerJS(WebRTC) and Electron.</h3>

  <figure>
    <video src="./example.mp4" width="420" controls></video>
    <figcaption>
      <!-- <p align="center">自由的 Markdown 管理工具。</p> -->
    </figcaption>
  </figure>
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