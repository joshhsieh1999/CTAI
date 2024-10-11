# analyzer

本文件介紹依附於 CTAI 平台的 analyzer 的各元件及運作方式。Analyzer 透過 docker 包裝成 image, 並上傳至 CTAI 私有的 docker hub，提供 k8s 拉取使用。

其中 analyzer container 與 trainer container 的交互是透過將資料夾 mount 出來達成，
trainer container 會將訓練結果 mount 到 `training-task/{projectId}/{versionId}/results`
而 analyzer container 透過將分析結果 mount 出來 (mount 到 `training-task/{projectId}/{versionId}/results/analysis_results`)，使得 CTAI 網頁平台可以透過 API 取得結果來呈現分析資料

## Scripts overview

- `Dockerfile`: 定義 analyzer 的 docker image 建構過程，包含所需的環境設置和依賴項。

- `start_and_monitor.sh`: 啟動 analyzer 並監控其運行狀態的 Shell 腳本，會在 container 準備好執行

- `analysis_crontab`: 為 linux crontab, 會在 `start_and_monitor.sh` 中被註冊啟動, 負責定期執行 `parse_log.py` 以取得即時訓練狀態。

- `parse_log.py`: 讀取模型端訓練時由 wandb 產出的序列化 log, 並使用 regex 抓取訓練中資訊(當前 epoch, 預計等待時間...)

- `log_utils.py`: 存放提供 `parse_log.py` 使用的資源

- `yolo_to_voc.py`: 將 YOLO 格式的數據轉換為 VOC（Visual Object Classes）格式的腳本，方便後續的腳本使用統一格式輸入。

- `confusion_matrix.py`: 生成混淆矩陣的腳本，用於評估模型性能。

- `dataset_check.py`: 生成資料集統計資訊。

- `all_class_AP.py`: 計算所有類別的平均精確度（Average Precision）的腳本，也包含 Precision 及 Recall，目前未使用，替代方案是在模型端(yolov5)在訓練完成後會呼叫 `val.py`(產生在 test dataset 上的 prediction), 期間就會計算指標，我們修改 `val.py` 的程式碼使指標產生後儲存在 `training-task/{projectId}/{versionId}/results/test/results.json`

## Development

為了可以在本地做測試，並且保持本地環境的乾淨，建議使用 [pyenv](https://github.com/pyenv/pyenv) 做 python 版控，pyenv 操作請參考網路教學
- Python version: `3.10.1`
- 在啟動 virtualenv 環境之後, 運行 `pip install -r requirements.txt`
- 就可以在 virtualenv 運行和測試腳本
- 腳本在完成改動後，要打包成 docker image 部屬到私有 docker hub 上, 使用 `sh ctai-scripts/image_build/model_build.sh` 來完成部屬

