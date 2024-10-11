#!/bin/bash

# Kubernetes Worker Node Removal Script
#
# This script is used to safely remove a Kubernetes worker node from the cluster.
# It drains the node, removes it from the cluster, and deletes it.
#
# Usage: ./setup/control_plane/remove_node.sh
# The script will prompt for the name of the worker node to be removed.
#
# Note: This script should be run on a machine with kubectl access to the cluster.
# Ensure that you have the necessary permissions to perform these operations.

# Function to check if a command was successful
check_command() {
    if [ $? -ne 0 ]; then
        echo "Error: $1"
        exit 1
    fi
}

# Function to check if the node exists in the cluster
check_node_exists() {
    if ! kubectl get node "$1" &> /dev/null; then
        echo "Error: Node $1 does not exist in the cluster."
        exit 1
    fi
}

# Function to drain the node
drain_node() {
    echo "Draining node $1..."
    kubectl drain "$1" --delete-emptydir-data --force --ignore-daemonsets
    check_command "Failed to drain node $1"
    echo "Node $1 drained successfully."
}

# Function to delete the node from the cluster
delete_node() {
    echo "Deleting node $1 from the cluster..."
    kubectl delete node "$1"
    check_command "Failed to delete node $1 from the cluster"
    echo "Node $1 deleted successfully from the cluster."
}

# Main execution
echo "Kubernetes Worker Node Removal Script"
echo "======================================="

# List the current nodes in the cluster
echo "Current nodes in the cluster:"
kubectl get nodes
echo "======================================="

# Prompt for worker node name
read -p "Enter the name of the worker node to be removed: " WORKER_NODE_NAME

# Check if the node name is not empty
if [ -z "$WORKER_NODE_NAME" ]; then
    echo "Error: Node name cannot be empty."
    exit 1
fi

# Check if the node exists
check_node_exists "$WORKER_NODE_NAME"

# Confirm removal
read -p "Are you sure you want to remove node [[$WORKER_NODE_NAME]] from the cluster? (y/n): " CONFIRM
if [[ $CONFIRM != [Yy] ]]; then
    echo "Operation cancelled."
    exit 0
fi

# Drain the node
drain_node "$WORKER_NODE_NAME"

# Delete the node
delete_node "$WORKER_NODE_NAME"

echo "Worker node $WORKER_NODE_NAME has been successfully removed from the cluster."
echo "Please ensure to delete the corresponding VM or physical machine if necessary."

kubectl get nodes -o wide
