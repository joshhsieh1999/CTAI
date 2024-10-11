# CTAI-scheduler

Click then AI 身為 NTHU HSNL 所開發之 No Code AI Platfrom，由許多不同的功能與框架所組成與協作。

本 Repo - CTAI Sechuduler 身為管理與建立 No Code AI Training Task 的核心部分，主要由 Docker 作為統一訓練環境的容器化技術，並利用 Kubernetes 作為機器的串連與操作核心，且需要特別注意安裝過程中對於 Nvidia GPU 的兼容與操作。

為了避免操作與安裝過程有所缺失，本 Repo 特別提供相關安裝腳本，相關使用方式請參閱下方 Installation Guide。

## Installation Guide

本專案提供了一個安裝腳本，可以自動安裝 CTAI-scheduler 所需的環境。

請注意，由於本專案有多台機器與不同的角色，因此需要在每台機器上執行不同的腳本，請注意選擇正確的腳本。

本專案主要有以下四大角色：
1. CTAI Main Server
2. CTAI Data Server
3. CTAI Kubernetes Control Plane
4. CTAI Kubernetes Worker Node

其中同一台機器（虛擬機）是可以同時擔任多個角色的（除了 CTAI Kubernetes Control Plane 不得為 Worker Node），也因此請注意正確機器上的身份與角色狀況，但請注意「**本系統建議所有機器上皆只有單一角色**」。

以下說明各角色的安裝方式與操作步驟。

### CTAI Main Server / CTAI Data Server

CTAI Main Server 是整個 CTAI 平台的主要伺服器，負責管理整個平台的運作，而 CTAI Data Server 則是負責儲存與管理訓練資料的伺服器。

本建立手冊請參考 [CTAI Main Server Installation Guide](https://git.hsnl.tw/iot/click-then-ai/setup)。相關安裝不在本專案的討論範圍內。

### CTAI Kubernetes Control Plane

CTAI Kubernetes Control Plane 是整個 CTAI 平台的控制平面，負責管理整個 Kubernetes Cluster 的運作。

為了避免 Main Server 在操作過程中的風險與缺失，並增加 Kubernetes 叢集的穩定性，本專案建議將 CTAI Kubernetes Control Plane 獨立於 Main Server 之外之獨立機器上。

要安裝 CTAI Kubernetes Control Plane，請執行以下指令：

```bash=
$ git clone https://git.hsnl.tw/iot/click-then-ai/ctai-scheduler.git && cd ctai-scheduler
$ bash ./setup/control_plane/setup.sh {step1|step2|step3}
```

並依照腳本的指示進行操作，需配合腳本進行所需要的必要系統重啟。

請注意，「**如果需要建立初始化叢集，請記得在 Do you want to initialize the Kubernetes cluster now? (y/n) 時回答 y，如果已經有叢集了，正在額外建立 control plane 來增加叢集強健性，則選擇 n**」，並依照腳本的指示進行操作。

### CTAI Kubernetes Worker Node

CTAI Kubernetes Worker Node 是整個 CTAI 平台的工作節點，負責執行所有的 AI 訓練工作。

本腳本會從 0 開始完成所有的安裝與設定，並且會自動安裝 Nvidia GPU 驅動程式與相關套件。

請注意，「**CTAI Kubernetes Worker Node 必須安裝在擁有 Nvidia GPU 的機器上**」，且「**CTAI Kubernetes Worker Node 不得擔任 CTAI Kubernetes Control Plane 的角色**」。

要安裝 CTAI Kubernetes Worker Node，請執行以下指令：

```bash=
$ git clone https://git.hsnl.tw/iot/click-then-ai/ctai-scheduler.git && cd ctai-scheduler
$ bash ./setup/worker_node/setup.sh {step1|step2|step3|step4|step5}
```


