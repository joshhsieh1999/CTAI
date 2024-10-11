This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Introduction

本專案是一個 No Code AI 的平台，旨在提供使用者一個簡易的操作介面，讓使用者可以藉由操作與互動引導，在不撰寫程式的情況下，完成 AI 模型的訓練與部署。

## Getting Started

### 設定及準備
確保你有一台 linux, 並且裝好以下工具:
- git
- docker
- VS code

然後，下載本專案:
 `git clone https://git.hsnl.tw/iot/click-then-ai/click-then-ai.git`

### Use `.devcontainer` for development

如果第一次在你的機器上運行本專案，請執行以下指令:

```bash
docker network create dev-network
```

來為我們的機器建立內部互通的網路


接下來，開啟 VS code -> 左上角的 File -> Open Folder -> 選擇剛剛下載本專案的資料夾
如果開啟正確，會看到右下角 VS code 顯示 "Reopen in container", 按下後即可在 container 中開啟本專案
接下來的介紹如果沒有特別提到，預設皆在 container 中執行

運行
```bash
npm install
```
下載所有會使用到的套件

如果你的 `RAG_storage/indexs` 底下沒有檔案，請執行以下指令:
```bash
npm run generate
```
來生成用於 AI Insight 的向量資料庫

接下來，你會需要在剛剛資料夾所在的位置(container 外)開一個 terminal, 並執行以下指令:
```bash
docker compose up
```
來啟用本專案的 mariadb 及 PMA


如果是第一次執行，需要運行以下指令建置好資料庫的欄位及關係
```bash
# if command not run successfully, `sudo` may help
npx prisma migrate dev --name init
```

接著，就可以啟動 server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

[Optional] If you need test data, wait for App ready and:
```bash
# if command not run successfully, `sudo` may help
npm run prisma:seed
```
It will call API and create test data to DB (due to dev mode, it will take a minute).

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
