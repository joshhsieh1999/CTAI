# CVAT

> 這是一個從 https://github.com/cvat-ai/cvat clone 下來的 project，加以修改之後的成果，現在你所看到是作為 CTAI 的一部份，對應的說明文件，如果要看原本的 README，請看 [README.cvat.md](README.cvat.md)

此 repo 為 CTAI 平台的 labeling system，我們從原本的 [CVAT](https://github.com/cvat-ai/cvat) clone 整個專案下來之後，把他做了客製化，並把檔案系統共用融合到 CTAI 之中，詳細說明請看以下內容。

也歡迎直接看 commit 來了解，做每個功能需求修改，需要動到哪裡的程式碼，我們自己修改的程式碼從[此 commit](https://git.hsnl.tw/iot/click-then-ai/cvat/-/commit/5c74e00261694c56b316214a356b41e29815bc1e) 開始，但由於體積龐大，建議還是要自己花時間熟悉它，以及閱讀 [CVAT 官方文件](https://docs.cvat.ai/docs/manual/basics/)來了解原來的 CVAT。

- 請至少首先理解 CVAT 本身的層級(Project, Task, Job, ...)、權限(User Role)設定
- CVAT 的一些 panel 請參閱 [Setup repo README](https://git.hsnl.tw/iot/click-then-ai/setup#developer-information)

## Introduction
CVAT 由多個 services 組成，詳情請看 compose.yml，，接下來將主要說明幾個重要，未來你可能會接觸和修改的部分。我們會以資料夾名稱為標題去做大致說明。
- 請注意不是每個 service 就代表一個資料夾，有些是一個資料夾但分別建了三個 service，所以還是需要自行 trace code

## Overview
- CVAT 和 CTAI 的 Auth 為兩者各自管理，藉由溝通討論需要如何修改，來達到兩者之間的使用體驗為流暢的。
- 我們藉由 CTAI 呼叫 CVAT API 來做到 CVAT 使用者創建、Org 創建, ... 等等行為，並達到由 CTAI 統一管理的作用
- e.g.
    - CTAI 註冊帳號 --- CTAI call API ---> 創建 CVAT 帳號 & get auth token 並存入 CTAI 資料庫
    - CTAI 創建 Project --- CTAI call API ---> 創建 CVAT Orginization
    - CTAI 創建 dataset --- CTAI call API ---> Orginization 底下的 Project 去創建新的 task

### CTAI 和 CVAT 的概念 Mapping
由於兩者基本上為獨立系統，面對相同的概念會有各自不同的稱呼，因此在此部分作釐清。

- CTAI Project <--> CVAT Organization
- CTAI Project Owner <--> CVAT Organization Owner 
    - 一個人可以在我們平台創建多個 Project, 相當於此 User 在 CVAT 創建多個的 Organization
- CTAI Project Member <--> CVAT Organization Supurvisor(default) 

### 前端修改
- 由於原有的 CVAT 功能過於豐富，因此我們會將前端相關不需要的功能拔掉
    - 移除設定 CVAT 帳號設定前端
    - 移除 Project 層級
    - 移除 Cloud Storage 
    - Task 增加 Segment size (幾張分一個 Job)改預設必填，並且 deafult value: 25
    - Add Label 功能選項只保留 Rectangle
    - Add "Choose this Dataset Button" to go back to CTAI training process
    - 其他移除功能請直接看這兩個 commit
        - https://git.hsnl.tw/iot/click-then-ai/cvat/-/commit/df41fa9216ac3f64eebc8533f1c12b37e383f24b
        - https://git.hsnl.tw/iot/click-then-ai/cvat/-/commit/45f14865fa085db5470bdad8aa4ef26eba92ab97
            - 當初 Commit 給錯，Display -> Disable
        - https://git.hsnl.tw/iot/click-then-ai/cvat/-/commit/51303ab97fdf51eda4f9a1245e312b7c77cf67fd
    
### Misc but may be important
- 目前把 Dataset 相關資料集(照片) mount 在本地，會放在 `.env` 的 `$CVAT_STORE_CTAI_DATASET_PATH` Path 中
    - CTAI 也會共同使用這份資料夾的檔案
- 我們藉由 localStorage 來達到 CTAI -> CVAT 不用另外登入的一站式體驗
- You can use settings in `CVAT admin account` part in `.env` file to login to CVAT auth admin panel (django)
- 為了把 CVAT deploy 在 CTAI 底下，希望達到 <URL>/cvat 底下去做存取，因此做了很多修改和測試
    - https://git.hsnl.tw/iot/click-then-ai/cvat/-/commit/536f35a9263906f2f7c4bcd7342c4ada83eb40e5
- 目前檔案上傳限制為 2GB


## Develop

### 一些開發過程中可能會常用到的指令
- rebulid all component
    - `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build`
- rebuild cvat_server (rego auth)
    - `docker compose -f docker-compose.yml -f docker-compose.dev.yml up cvat_opa cvat_server --build`
- rebuild cvat_ui
    - `docker compose -f docker-compose.yml -f docker-compose.dev.yml up cvat_ui --build`
- set CVAT_HOST
    - linux: `export CVAT_HOST=<private IP>`
    - Windows: `set CVAT_HOST=localhost`
- enter docker instance bash
    - `docker exec -it ${id} \bin\sh`
- clean docker cache
    - `docker builder prune`

## Use Case Example
接下來以功能為導向提供說明和對應可查看的 commit 指引。

### 如何修改 CVAT 中的角色權限?
- 請首先了解 CVAT 的 [User roles 說明](https://docs.cvat.ai/docs/manual/advanced/iam_user_roles/)
- 詳情程式碼修改請看[此 commit](https://git.hsnl.tw/iot/click-then-ai/cvat/-/commit/5b48358e30ed0ed22511f564a52740f88d28ad0b)
- 我們基於以上設定，額外給予了 SUPERVISORS & OWNERS role 只要在相同組織情況下，皆可以有看到(Viewable)、修改、assign work, 在 task & job 上
    - 實現使用者只要在相同組織底下，即可協作 project


