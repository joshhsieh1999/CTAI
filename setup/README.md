# CTAI Service Installation and Configuration Guide

## Project Description

CTAI (Click-Then-AI) is an AI-assisted annotation platform integrated with CVAT (Computer Vision Annotation Tool). This guide will help you set up and run the CTAI service.

## System Requirements

- Hardware
  - CPU: 8 Cores
  - Memory: 16 GB
  - Storage: At least 100 GB
- OS
  - Ubuntu 22.04 LTS (Minimized Install)
- Packages
  - Git, Docker, and Docker Compose

## Installation Guide

### Preparation

1. Prepare a clean Ubuntu 22.04 LTS server (minimized install).
2. Clone the following repositories in the same directory:
   - setup (https://git.hsnl.tw/iot/click-then-ai/setup.git)
   - ctai (https://git.hsnl.tw/iot/click-then-ai/ctai.git)
   - cvat (https://git.hsnl.tw/iot/click-then-ai/cvat.git)
   - ctai-scripts (https://git.hsnl.tw/iot/click-then-ai/ctai-scripts.git)
   - ctai-models (https://git.hsnl.tw/iot/click-then-ai/ctai-models.git)
   - ctai-scheduler (https://git.hsnl.tw/iot/click-then-ai/ctai-scheduler.git)

Your directory structure should look like this:

```
CTAI_ROOT (suggested to be HOME directory in a clean server, but you can change it to any directory)
├── setup
├── ctai
├── cvat
├── ctai-scripts
├── ctai-models
└── ctai-scheduler
```

### Installation Steps

1. Navigate to the `setup` directory.
2. Run setup.sh with `bash setup.sh {setup_env|check_env|setup_dirs}` command to prepare the Docker services required for the platform.
   - `setup_env [force]`: Set up the .env file (use 'force' to overwrite). This will create a `.env` file in the `setup` directory which copies the `.env.example` file and sets the necessary environment variables.
   - `check_env`: Check and prepare the environment. This will check if the `.env` file exists and install the necessary packages (Docker and Docker Compose).
   - `setup_dirs`: Create necessary directories. This will create necessary directories for the CTAI service under the `CTAI_ROOT` directory.
3. Run `docker compose up` to start the services.

**Important: Currently using Dockerfile.dev for ctai_app service. Change this for production mode.**

## File Description

- `.env.example`
  - Example `.env` file
- `setup.sh`
  - Installation and check script for the entire system to ensure the system is correctly set up, has the necessary packages/directories, and sets environment variables.
- `compose.yml`
  - Official docker compose file to start ctai+cvat services
  - Contains two parts of settings (CTAI & CVAT)
- `compose.dev.yml`
  - Development mode docker compose file
  - Default open ports on CTAI (pma) & CVAT (pgadmin) db web interface UI, CVAT (cvat_traefik) backend django admin page
  - You can uncomment the services depending on what you need
- `nginx.conf`
  - Reverse proxy info between CVAT & CTAI

## Usage Instructions

### Starting the Service

1. Ensure you are in the `setup` directory.
2. Run `docker compose up`.
3. Wait for all services to start. If the CVAT API responds with 405, it means the application is still migrating.

### Development Mode

- Generate example data (non-production mode only):
  ```
  docker exec -it <ctai_app_name> /bin/sh
  npm run prisma:seed
  ```
  - Once you generate the example data, you can login to the pma panel to get the test users' information to login
- Rebuild services:
  ```
  docker compose down -v
  docker compose up --build -d
  ```
- Merge development configuration:
  ```
  docker compose -f compose.yml -f compose.dev.yml up --build -d
  ```
  - **Remember to uncomment services in compose.dev.yml you want to debug**
- Rebuild a specific service:
  ```
  docker compose up <service_name> --build
  ```
- If your node is in `dev` mode, you can use this command to make ctai reload your modified code without rebuilding it:
  - `docker cp "<your_code_path>" "<running_container_name>:<dest_code_path>"`
  - Example: `docker cp "/home/hsnl/old.bk/dogq/click-then-ai/app/(dashboard)/report/[project_id]/[version_id]/view/Charts/chartConfusionMatrix.tsx" "ctai-main-ctai_app-1:/usr/src/app/app/(dashboard)/report/[project_id]/[version_id]/view/Charts/chartConfusionMatrix.tsx"`
- **Note: If you rebuild the db, all data will be deleted**

## Configuration Options

Refer to the `.env.example` file for detailed configuration options.

## Troubleshooting

If the CVAT API responds with 405, wait for the application to complete migration.

## Developer Information

- CVAT backend Django admin page: `http://<host>:8080/admin`
- CVAT service health check panel: `http://<host>:8090`
- CVAT PostgreSQL: `http://<host>:8888`
- CTAI phpMyAdmin: `http://<host>:8088`

Note: Ensure `compose.dev.yml` is correctly configured before using these panels.

## Important Notes

- **The installation and configuration in `setup` only cover the main CTAI platform, not the Kubernetes settings for the training scheduling system. Refer to `ctai-scheduler` for related settings.**
- **Rebuilding the database will delete all data.**

# CTAI 服務安裝與設定文件

## 專案說明

CTAI（Click-Then-AI）是一個與 CVAT（Computer Vision Annotation Tool）整合的 AI 輔助標註平台。本文件將幫助你設定並啟動 CTAI 服務。

## 系統需求

- 硬體
  - CPU：8 核心
  - 記憶體：16 GB
  - 儲存空間：至少 100 GB
- 作業系統
  - Ubuntu 22.04 LTS（最小化安裝）
- 套件
  - Git、Docker 和 Docker Compose

## 安裝文件

### 準備工作

1. 準備一個乾淨的 Ubuntu 22.04 LTS 伺服器（最小化安裝）。
2. 在同一目錄下 Clone 以下 Repository：
   - setup (https://git.hsnl.tw/iot/click-then-ai/setup.git)
   - ctai (https://git.hsnl.tw/iot/click-then-ai/ctai.git)
   - cvat (https://git.hsnl.tw/iot/click-then-ai/cvat.git)
   - ctai-scripts (https://git.hsnl.tw/iot/click-then-ai/ctai-scripts.git)
   - ctai-models (https://git.hsnl.tw/iot/click-then-ai/ctai-models.git)
   - ctai-scheduler (https://git.hsnl.tw/iot/click-then-ai/ctai-scheduler.git)

你的目錄結構應該如下所示：

```
CTAI_ROOT（建議為乾淨伺服器的 HOME 目錄，但你可以更改為任何目錄）
├── setup
├── ctai
├── cvat
├── ctai-scripts
├── ctai-models
└── ctai-scheduler
```

### 安裝步驟

1. 進入 `setup` 目錄。
2. 執行 `bash setup.sh {setup_env|check_env|setup_dirs}` 命令來啟動 setup.sh，準備平台所需的 Docker 服務
   - `setup_env [force]`：設定 .env 文件（使用 'force' 覆蓋）。這將在 `setup` 目錄中創建一個 `.env` 文件，複製 `.env.example` 文件並設定必要的環境變量。
   - `check_env`：檢查並準備環境。這將檢查 `.env` 文件是否存在，並安裝必要的套件（Docker 和 Docker Compose）。
   - `setup_dirs`：創建必要的目錄。這將在 `CTAI_ROOT` 目錄下為 CTAI 服務創建必要的目錄。
3. 執行 `docker compose up` 啟動服務。

**重要：目前 ctai_app 服務使用 Dockerfile.dev。如需生產模式，請進行對應的更改。**

## 文件說明

- `.env.example`
  - 示範的 `.env` 文件
- `setup.sh`
  - 整個系統的安裝與檢查腳本，用來確認系統是否正確設定、正確所需要的套件/目錄，並設定環境變數。
- `compose.yml`
  - 官方 docker compose 文件，用於啟動 ctai+cvat 服務
  - 包含兩部分設定（CTAI 和 CVAT）
- `compose.dev.yml`
  - 開發模式 docker compose 文件
  - 默認開放 CTAI（pma）和 CVAT（pgadmin）資料庫 Web 介面 UI，CVAT（cvat_traefik）後端 django 管理頁面的端口
  - 你可以根據需要取消註釋服務
- `nginx.conf`
  - CVAT 和 CTAI 之間的反向代理信息

## 使用說明

### 啟動服務

1. 確保你在 `setup` 目錄中。
2. 執行 `docker compose up`。
3. 等待所有服務啟動。如果 CVAT API 回應 405，表示應用程序仍在遷移中。

### 開發模式

- 生成示範的數據（僅限非生產模式）：
  ```
  docker exec -it <ctai_app_name> /bin/sh
  npm run prisma:seed
  ```
- 重建服務：
  ```
  docker compose down -v
  docker compose up --build -d
  ```
- 合併開發設定：
  ```
  docker compose -f compose.yml -f compose.dev.yml up --build -d
  ```
  - **請記得取消註釋 compose.dev.yml 中你想要調試的服務**
- 重建特定服務：
  ```
  docker compose up <service_name> --build
  ```
- 如果你的節點處於 `dev` 模式，你可以使用以下命令使 ctai 重新加載你修改的代碼，而無需重建：
  - `docker cp "<your_code_path>" "<running_container_name>:<dest_code_path>"`
  - 示範的：`docker cp "/home/hsnl/old.bk/dogq/click-then-ai/app/(dashboard)/report/[project_id]/[version_id]/view/Charts/chartConfusionMatrix.tsx" "ctai-main-ctai_app-1:/usr/src/app/app/(dashboard)/report/[project_id]/[version_id]/view/Charts/chartConfusionMatrix.tsx"`
- **注意：如果重建資料庫，所有數據都將被刪除**

## 設定選項

詳細設定選項請參考 `.env.example` 文件。

## 故障排除

如果 CVAT API 回應 405，請等待應用程序完成遷移。

## 開發者信息

- CVAT 後端 Django 管理頁面：`http://<host>:8080/admin`
- CVAT 服務健康檢查面板：`http://<host>:8090`
- CVAT PostgreSQL：`http://<host>:8888`
- CTAI phpMyAdmin：`http://<host>:8088`

注意：使用這些面板前，請確保正確設定了 `compose.dev.yml`。

## 重要提示

- **`setup` 中的安裝和設定僅涵蓋 CTAI 主平台，不包括訓練調度系統的 Kubernetes 設定。相關設定請參考 `ctai-scheduler`。**
- **重建資料庫將刪除所有數據。**
