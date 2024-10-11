# 基於 Python 環境
FROM python:3.10

# 安裝 cron 和其他必需的工具
RUN apt-get update && apt-get autoremove -y && apt-get install -y cron ffmpeg libsm6 libxext6

# 創建 hsnl 使用者和群組，並將 UID 和 GID 設為 1000
RUN groupadd -g 1000 hsnl && \
    useradd -m -u 1000 -g 1000 -s /bin/bash hsnl && \
    echo "hsnl ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# 設定工作目錄
RUN mkdir -p /workspace
RUN chown -R 1000:1000 /workspace && \
    chmod -R 775 /workspace

# 允許 hsnl:hsnl 使用者對特定目錄進行寫入操作
RUN chown -R hsnl:hsnl /var/log && \
    chmod -R 775 /var/log && \
    chown -R hsnl:hsnl /var/spool/cron/crontabs && \
    chmod -R 775 /var/spool/cron/crontabs && \
    mkdir -p /var/run/cron && \
    chown -R hsnl:hsnl /var/run/cron && \
    chmod -R 775 /var/run/cron && \
    chown -R hsnl:hsnl /var/run && \
    chmod -R 775 /var/run && \
    touch /var/run/cron/crond.pid && \
    chgrp hsnl /var/run/cron/crond.pid && \
    usermod -a -G hsnl hsnl

# 設置符號鏈接以確保所有 python 和 python3 命令指向 python 3.10
RUN ln -sf /usr/local/bin/python3.10 /usr/bin/python && \
    ln -sf /usr/local/bin/python3.10 /usr/bin/python3

# 設定工作目錄為 /workspace
WORKDIR /workspace

# 複製解析器腳本
COPY . ./analyzer

# 安裝 Python 依賴
RUN pip install --upgrade pip
RUN pip install --no-cache-dir --upgrade -r analyzer/requirements.txt
# RUN pip install --no-cache-dir opencv-python --upgrade
    # pip install --no-cache-dir "opencv-python-headless<4.3" && \
    # pip install --no-cache-dir opencv-fixer==0.2.5 && \
    # python -c "from opencv_fixer import AutoFix; AutoFix()"
# RUN pip install --no-cache-dir numpy --upgrade

# RUN python -c "import cv2";

# 設定環境變量
ENV PYTHONPATH=/usr/local/lib/python3.10/site-packages
ENV PYTHON_BIN=/usr/local/bin/python3.10

# 啟動 crontab，並指定 crond.pid 文件的存儲位置
CMD ["./start_and_monitor.sh"]
