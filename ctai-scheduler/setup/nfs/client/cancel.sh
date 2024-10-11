#!/bin/bash

# CTAI NFS Client Cleanup Script
#
# This script is used to unmount the NFS share and clean up the directory on the worker node.
# It will unmount the NFS share, remove the entry from /etc/fstab, and delete the mount directory.
#
# Usage: sudo ./setup/nfs/client/cancel.sh
#
# Note: This script should be run with sudo privileges.

# Function to check if a command was successful
check_command() {
    if [ $? -ne 0 ]; then
        echo "Error: $1"
        exit 1
    fi
}

# Default NFS mount directory
NFS_MOUNT_DIR="/mnt/training-task"

# Main execution
echo "CTAI NFS Client Cleanup Script"
echo "=============================="

# Confirm the mount directory
read -p "Enter the NFS mount directory to unmount (default: $NFS_MOUNT_DIR): " input_dir
NFS_MOUNT_DIR=${input_dir:-$NFS_MOUNT_DIR}

# Check if the directory exists
if [ ! -d "$NFS_MOUNT_DIR" ]; then
    echo "Error: Directory $NFS_MOUNT_DIR does not exist."
    exit 1
fi

# Confirm cleanup
echo "You are about to unmount and remove the following NFS mount:"
echo "Mount Directory: $NFS_MOUNT_DIR"
read -p "Do you want to continue? (y/n): " confirm
if [[ $confirm != [Yy] ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

# Unmount the NFS share
echo "Unmounting NFS share..."
sudo umount "$NFS_MOUNT_DIR"
check_command "Failed to unmount $NFS_MOUNT_DIR"

# Remove the entry from /etc/fstab
echo "Removing entry from /etc/fstab..."
sudo sed -i "\|$NFS_MOUNT_DIR|d" /etc/fstab
check_command "Failed to remove entry from /etc/fstab"

# Remove the directory
echo "Removing mount directory..."
sudo rm -rf "$NFS_MOUNT_DIR"
check_command "Failed to remove directory $NFS_MOUNT_DIR"

echo "NFS share has been unmounted and cleaned up successfully."
