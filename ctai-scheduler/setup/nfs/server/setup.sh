#!/bin/bash

# CTAI NFS Server Setup Script
#
# This script sets up an NFS server on the CTAI application server.
# It installs the NFS server, creates a shared directory, and configures the NFS exports.
#
# Usage: ./setup/nfs/server/setup.sh
# The script will prompt for the network segment to share the NFS with.
#
# Note: This script should be run with sudo privileges.

# Function to check if a command was successful
check_command() {
    if [ $? -ne 0 ]; then
        echo "Error: $1"
        exit 1
    fi
}

# Function to validate IP subnet format
validate_subnet() {
    if [[ ! $1 =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}/[0-9]{1,2}$ ]]; then
        echo "Error: Invalid subnet format. Please use format like 192.168.2.0/24"
        exit 1
    fi
}

# Function to install NFS server
install_nfs_server() {
    if dpkg -s nfs-kernel-server >/dev/null 2>&1; then
        echo "NFS server is already installed."
        return
    fi

    echo "Installing NFS server..."
    sudo apt-get update
    sudo apt-get install -y nfs-kernel-server
    check_command "Failed to install NFS server"
}

# Function to create and configure shared directory
setup_shared_directory() {
    # 新增：提示用戶輸入路徑
    read -p "Enter the path for the shared directory (default: $HOME/training-task): " share_dir
    # 如果用戶沒有輸入，使用默認路徑
    share_dir=${share_dir:-"$HOME/training-task"}

    echo "Creating shared directory: $share_dir"
    mkdir -p "$share_dir"
    sudo chown -R "$USER:$USER" "$share_dir"
    sudo chmod -R 775 "$share_dir"
    check_command "Failed to set up shared directory"
}

# Function to configure NFS exports
configure_nfs_exports() {
    local exports_file="/etc/exports"
    # 使用傳入的 share_dir 參數
    local exports_line="$2 $1(rw,sync,no_subtree_check,anonuid=$(id -u),anongid=$(id -g))"

    echo "Configuring NFS exports..."
    # Backup existing exports file
    sudo cp "$exports_file" "${exports_file}.bak"

    # Add new export line
    echo "$exports_line" | sudo tee -a "$exports_file"
    check_command "Failed to configure NFS exports"
}

# Function to restart NFS server
restart_nfs_server() {
    echo "Restarting NFS server..."
    sudo exportfs -ra
    sudo systemctl restart nfs-kernel-server
    check_command "Failed to restart NFS server"
}

# Function to update PV YAML
update_pv_yaml() {
    local server_ip=$1
    local share_dir=$2
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local pv_file="${script_dir}/kubernetes/pv-nfs.yaml"

    if [ ! -f "$pv_file" ]; then
        echo "Error: $pv_file not found. Please ensure the file exists in the kubernetes directory."
        return 1
    fi

    # Create a backup of the original file
    cp "$pv_file" "${pv_file}.bak"

    # Update server IP and path in the YAML file
    sed -i "s|server:.*|server: \"$server_ip\"|" "$pv_file"
    sed -i "s|path:.*|path: \"$share_dir\"|" "$pv_file"

    echo "Updated $pv_file with server IP: $server_ip and path: $share_dir"
    echo "A backup of the original file has been created as ${pv_file}.bak"
}

# Main execution
echo "CTAI NFS Server Setup Script"
echo "============================"

# Prompt for network segment
read -p "Enter the network segment you want to share (e.g., 192.168.2.0/24): " NFS_SUBNET
validate_subnet "$NFS_SUBNET"

# Prompt for Kubernetes PV update
read -p "Do you want to update the Kubernetes PV YAML file? (y/n): " UPDATE_K8S_YAML

# 新增：設置共享目錄
setup_shared_directory
# 將 share_dir 保存到變數中
SHARE_DIR="$share_dir"

# Confirm settings
echo "You are about to set up an NFS server with the following settings:"
echo "Shared directory: $SHARE_DIR"
echo "Network segment: $NFS_SUBNET"
echo "Update K8s PV YAML: ${UPDATE_K8S_YAML}"
read -p "Do you want to continue? (y/n): " confirm
if [[ $confirm != [Yy] ]]; then
    echo "Setup cancelled."
    exit 0
fi

# Run setup steps
install_nfs_server
# 修改：傳遞 SHARE_DIR 到 configure_nfs_exports
configure_nfs_exports "$NFS_SUBNET" "$SHARE_DIR"
restart_nfs_server

echo "NFS server setup completed successfully."
echo "Shared directory: $SHARE_DIR"
echo "Allowed network segment: $NFS_SUBNET"

# Update Kubernetes PV YAML file if requested
if [[ $UPDATE_K8S_YAML == [Yy] ]]; then
    SERVER_IP=$(hostname -I | awk '{print $1}')
    # 修改：傳遞 SHARE_DIR 到 update_pv_yaml
    update_pv_yaml "$SERVER_IP" "$SHARE_DIR"
    if [ $? -eq 0 ]; then
        echo "Kubernetes PV YAML file has been updated."
        echo "Please review the pv-nfs.yaml file and apply it using kubectl if needed."
    else
        echo "Failed to update PV YAML file."
    fi
fi
