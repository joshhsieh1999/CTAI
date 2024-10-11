#!/bin/bash

# CTAI NFS Client Setup Script
#
# This script sets up an NFS client on a worker node for the CTAI system.
# It installs the NFS client tools, creates a mount point, and configures the NFS mount.
#
# Usage: sudo ./setup_nfs_client.sh
# The script will prompt for the NFS server IP address.
#
# Note: This script should be run with sudo privileges.

# Function to check if a command was successful
check_command() {
    if [ $? -ne 0 ]; then
        echo "Error: $1"
        exit 1
    fi
}

# Function to validate IP address format
validate_ip() {
    if [[ ! $1 =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "Error: Invalid IP address format. Please use format like 192.168.1.100"
        exit 1
    fi
}

# Function to install NFS client
install_nfs_client() {
    if dpkg -s nfs-common >/dev/null 2>&1; then
        echo "NFS client is already installed."
        return
    fi

    echo "Installing NFS client..."
    sudo apt-get update
    sudo apt-get install -y nfs-common
    check_command "Failed to install NFS client"
}

# Function to create mount point
create_mount_point() {
    local mount_point="$1"
    echo "Creating mount point: $mount_point"
    sudo mkdir -p "$mount_point"
    sudo chown -R hsnl:hsnl "$mount_point"
    sudo chmod -R 775 "$mount_point"
    check_command "Failed to create or configure mount point"
}

# Function to mount NFS share
mount_nfs_share() {
    local server_ip="$1"
    local shared_dir="$2"
    local mount_point="$3"

    echo "Mounting NFS share..."
    sudo mount "$server_ip:$shared_dir" "$mount_point"
    check_command "Failed to mount NFS share"

    # Add entry to /etc/fstab for persistent mount
    if ! grep -q "$server_ip:$shared_dir" /etc/fstab; then
        echo "$server_ip:$shared_dir $mount_point nfs defaults 0 0" | sudo tee -a /etc/fstab
        check_command "Failed to add entry to /etc/fstab"
    fi
}

# Main execution
echo "CTAI NFS Client Setup Script"
echo "============================"

# Prompt for NFS server IP
read -p "Enter the NFS server IP address: " NFS_SERVER_IP
validate_ip "$NFS_SERVER_IP"

# Set default shared directory path and mount point
DEFAULT_SHARED_DIR="/home/hsnl/training-task"
DEFAULT_MOUNT_POINT="/mnt/training-task"

# Prompt for shared directory path
read -p "Enter the shared directory path on the NFS server (default: $DEFAULT_SHARED_DIR): " SHARED_DIR
SHARED_DIR=${SHARED_DIR:-$DEFAULT_SHARED_DIR}

# Prompt for mount point
read -p "Enter the local mount point (default: $DEFAULT_MOUNT_POINT): " MOUNT_POINT
MOUNT_POINT=${MOUNT_POINT:-$DEFAULT_MOUNT_POINT}

# Confirm settings
echo "You are about to set up an NFS client with the following settings:"
echo "NFS Server IP: $NFS_SERVER_IP"
echo "Shared Directory: $SHARED_DIR"
echo "Local Mount Point: $MOUNT_POINT"
read -p "Do you want to continue? (y/n): " confirm
if [[ $confirm != [Yy] ]]; then
    echo "Setup cancelled."
    exit 0
fi

# Run setup steps
install_nfs_client
create_mount_point "$MOUNT_POINT"
mount_nfs_share "$NFS_SERVER_IP" "$SHARED_DIR" "$MOUNT_POINT"

echo "NFS client setup completed successfully."
echo "NFS share mounted at: $MOUNT_POINT"
echo "To verify, please run: mount | grep nfs"
