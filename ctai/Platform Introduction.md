# Platform introduction
此文件著重於 Click-then AI 主平台的說明，詳細介紹各部件的功能以及互動方式，另外與 CVAT 及其他工具整合後的版本在 https://git.hsnl.tw/iot/click-then-ai/ctai-main repo 可以看到

在開始閱讀之前，確保已熟悉 [Next.js APP router](https://nextjs.org/docs/app/building-your-application) 架構

### Project Structure

本專案主要結構如下：
```plaintext=
app/
├── (auth)/
│   ├── login/
│   └── contact-us/
├── (custom-error)/
├── (dashboard)/
|   ├── project/
|   │   ├── create/
|   │   ├── [project_id]/edit/
|   │   └── page.tsx
|   ├── report/
|   │   └── [project_id]/[version_id]/
|   |   │   ├── status/
|   |   │   ├── view/
|   |   │   └── page.tsx
|   └── setting/
├── api/
│   ├── auth/
│   │   chat/
│   │   models/
│   │   organizations/
│   │   projects/
│   │   users/
│   └── versions/
├── css/
├── lib/
├── provider/
├── types/
└── ui/

RAG_storage/
├── data/
└── indexs/

database/
└── init.sql

prisma/
├── schema.prisma
└── seed.ts

...

```


接下來會進行各部件的介紹

## (auth)

`auth` 目錄負責用戶認證和聯絡功能。包括以下子目錄：
- **login**：用戶登錄頁面，與 CVAT 登入系統連動，登入時 CVAT server 必須在線。
- **contact-us**：提供想使用我們服務的潛在客戶連絡我們的窗口，為預留的頁面，目前沒有串接。

## (custom-error)
此資料夾底下包含自訂的錯誤頁面，目前有 403 permision denied

## (dashboard)

`dashboard` 目錄是用戶界面的核心，使用隱藏路由統括，提供各種功能

### project
- **page.tsx**: 展示該使用者有權限存取的所有專案
- **create**：創建新專案的介面, 可讓使用者輸入專案名稱及專案類型，目前支援物件偵測類型。
- **[project_id]/edit**：基於專案 ID 編輯現有專案的介面, 包含專案顯示所需要的所有頁面。
    - **member**: 專案成員管理頁面，提供新增刪除專案成員。
    - **dataset**: 資料集準備頁面，此頁面實作跳轉至 CVAT 並且顯示 CVAT 標註完的照片。
    - **model**: 模型設定頁面，包含模型選擇及參數設定。
    - **done**: 在 model 頁面後按下開始訓練後的頁面，為銜接到 version 的頁面。
    - **version**: 展示該專案下所有 version 的頁面，包含各 version 目前的狀態。

### report
- **page.tsx**: 展示該使用者有權限存取的所有專案的所有 version 
- **[project_id]/[version_id]**：視覺化特定專案 version 的內容。
    - **status**：顯示專案 version 的當前狀態，僅在模型**正在訓練時** 可以從 `/(dashboard)/project/[project_id]/edit/version` 以及 `/(dashboard)/report` 跳轉到此頁面。視覺化展示訓練時的狀態
    - **view**：在模型**完成訓練後** 可以從 `/(dashboard)/project/[project_id]/edit/version` 以及 `/(dashboard)/report` 跳轉到此頁面。視覺化展示訓練成果

## setting
管理用戶和專案設置，支持自訂和配置，目前實作更改名稱，並且預留語系更改的擴充。


## api

`api` 目錄包含各種功能的 API 端點, 詳細各 API 行為請參照 API 內註解，以下僅概述各目錄:
- **auth**：管理登入和身分驗證相關的 API 調用。
- **chat**：提供 AI Insight 相關的 LLM 搭配 RAG 應用的 API
- **models**：目前只有一個 API `models/projects/[projectId]`, 透過 projectId 獲取該專案可以使用的模型
- **organizations**：處理組織相關的 API 調用。
- **projects**：管理專案相關的 API 調用。
- **users**：提供用戶管理的端點。
- **versions**：管理 version 控制及相關的 API 調用。

## css

`css` 目錄包含平台的所有樣式文件。所有 css style 文件建議存在這裡。

## lib

`lib` 目錄包含平台中使用的實用函數和庫。包含後端驗證及輔助套件相關的函式都會放這裡

## provider

`provider` 包含所有 provider, 務必將 provider 類都放在這裡統一管理

## types

`types` 目錄包含所有 TypeScript 類型定義，統一管理

## ui

`ui` 目錄包含可重用的 UI 組件。這些組件在平台的不同部分中使用，以保持一致的用戶界面並提高開發效率。

## RAG_storage
存放 Report page 會使用到的 AI Insight 功能的 RAG 資料。
可以使用 `npm run generate` 執行生成向量資料庫
- **data**：要將做為知識的原始文件放在此資料夾
- **indexs**：儲存經過 embedding 後的向量們的資料夾(以 json 檔儲存)

## prisma
作為 [ORM](https://www.prisma.io/dataguide/types/relational/what-is-an-orm) 工具，負責代管資料庫操作，讓 Next.js 對資料庫的操作更容易且好管理

- **schema.prisma**: 定義所有使用到的 table 及相關的 relation
- **seed.ts**: 生成測試資料用的腳本，可以使用 `npm run prisma:seed` 執行

## public
放所有可以任使用者公開儲存的資料，一般都是圖片

## 其他重要的檔案
下列檔案都位於專案根目錄
- **.env.example**: 存放 env 的範例，其中 .env 會被 git ignore, .env 務必自行妥善保存，不要直接將敏感資料洩漏
- **.gitignore**: 不想推上 git 的東西都寫在裡面
- **CTAI.postman_collection.json**: [Postman](https://www.postman.com/) 的匯出檔, 方便做 API 的 debug
- **middleware.ts**: 負責做頁面的權限放行管理
- **package.json**: 裡面包含可以自訂的 npm 指令
