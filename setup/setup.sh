#!/bin/bash

# CTAI Main Server & CVAT Server Setup Script
#
# This script sets up the environment for CTAI and CVAT on Ubuntu Server 22.04 LTS.
# It creates a .env file, prepares the environment, and sets up necessary directories.
#
# Usage: ./setup.sh {setup_env|check_env|setup_dirs}

set -e

# Load environment variables
load_env() {
    if [ -f .env ]; then
        source .env
    else
        echo "Error: .env file not found. Run './setup.sh setup_env' first."
        exit 1
    fi
}

# Function to set up .env file
setup_env() {
    if [ -f .env ] && [ "$1" != "force" ]; then
        echo ".env file exists. Use 'setup_env force' to overwrite."
        return
    fi

    cp .env.example .env
    echo ".env file created from .env.example"

    read -p "Enter server's private IP (e.g., 192.168.51.200): " server_ip
    [ -z "$server_ip" ] && {
        echo "Error: SERVER_IP is required."
        exit 1
    }
    sed -i "s|^SERVER_IP=.*|SERVER_IP=\"$server_ip\"|" .env

    read -p "Enter installation path (default: ${HOME}): " install_path
    install_path=${install_path:-$HOME}
    sed -i "s|^INSTALL_PATH=.*|INSTALL_PATH=\"$install_path\"|" .env

    echo ".env file has been updated with your inputs."
    echo "WARNING: Please review and modify other important parameters in the .env file,"
    echo "such as usernames, passwords, and API keys. Do not use default values in production."
}

# Function to update system and install packages
update_and_install() {
    echo "Updating system and installing packages..."
    sudo apt-get update && sudo apt-get upgrade -y
    sudo apt-get install -y apt-utils git vim curl wget tmux htop net-tools
    sudo apt-get autoremove -y && sudo apt-get autoclean -y
}

# Global variable to track if a reboot is needed
REBOOT_NEEDED=false

# Function to check/install Docker
check_docker() {
    if ! command -v docker &>/dev/null; then
        echo "Installing Docker..."
        curl -fsSL https://get.docker.com | sudo sh
        sudo usermod -aG docker "$USER"
        echo "Docker installed. Please log out and back in to use Docker without sudo."
        REBOOT_NEEDED=true
    else
        echo "Docker is already installed."
    fi
}

# Function to check and create directories
setup_dirs() {
    load_env
    local dirs=("$CVAT_STORE_CTAI_DATASET_PATH" "$TRAINING_MOUNT_PATH" "$RAG_PATH")
    local names=("CVAT Volume" "CTAI Training Volume" "RAG Volume")

    for i in "${!dirs[@]}"; do
        if [ ! -d "${dirs[$i]}" ]; then
            sudo mkdir -p "${dirs[$i]}"
            sudo chown 1000:1000 "${dirs[$i]}"
            sudo chmod 775 "${dirs[$i]}"
            echo "${names[$i]} dir created: ${dirs[$i]}"
        else
            echo "${names[$i]} dir exists: ${dirs[$i]}"
        fi
    done
}

# Function to check project directories
check_project_dirs() {
    load_env
    local dirs_to_check=("ctai" "cvat" "ctai-scripts" "ctai-models")
    local missing_dirs=()

    for dir in "${dirs_to_check[@]}"; do
        if [ ! -d "${INSTALL_PATH}/${dir}" ]; then
            missing_dirs+=("$dir")
        fi
    done

    if [ ${#missing_dirs[@]} -eq 0 ]; then
        echo "All required directories exist in ${INSTALL_PATH}"
    else
        echo "Warning: The following directories are missing in ${INSTALL_PATH}:"
        for dir in "${missing_dirs[@]}"; do
            echo "  - $dir"
        done
        echo "You may need to clone these repositories manually."
    fi
}

# Function to check environment
check_env() {
    load_env
    update_and_install
    check_docker
    check_project_dirs

    if [ "$REBOOT_NEEDED" = true ]; then
        echo "A system reboot is recommended to complete the setup."
        echo "Do you want to reboot now? (y/n)"
        read -r answer
        if [ "$answer" = "y" ]; then
            echo "Rebooting the system..."
            sudo reboot
        else
            echo "Please remember to reboot your system later to complete the setup."
        fi
    fi
}

# Main execution
case "$1" in
setup_env)
    setup_env "$2"
    ;;
check_env)
    check_env
    ;;
setup_dirs)
    setup_dirs
    ;;
*)
    echo "Usage: $0 {setup_env|check_env|setup_dirs|all}"
    echo "  setup_env [force]: Set up the .env file (use 'force' to overwrite)"
    echo "  check_env: Check and prepare the environment"
    echo "  setup_dirs: Create necessary directories"
    ;;
esac
