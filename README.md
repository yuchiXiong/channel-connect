# Channel Connect

A file transfer tool MVP based PeerJS(WebRTC) and Electron.

## Install PeerJS Server

```shell
npm install peer -g

peerjs --port 9000 --key peerjs --path /myapp
```

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

pnpm i

pnpm run dev
```
cd ./packages/mobile

flutter pub get

flutter run
```