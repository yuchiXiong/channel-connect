# Channel Connect

A file transfer tool MVP based PeerJS(WebRTC) and Electron.

## Start Server

```shell
cd ./packages/server

pnpm i

pnpm run start
```

Check it: http://127.0.0.1:9000/myapp It should returns JSON with name, description and website fields.

## Start Web

```shell
cd ./packages/web

pnpm i

pnpm run dev
```

## start Electron Client

```shell
cd ./packages/core

pnpm i

pnpm run start
```

## Start Mobile App

```shell
cd ./packages/mobile

flutter pub get

flutter run
```