#!/bin/bash

# Nvidia Environment Setup Script for Ubuntu 22.04 LTS
#
# This script automates the setup of Nvidia GPU environment on Ubuntu 22.04 LTS.
# It includes the installation of Nvidia drivers, CUDA toolkit, Docker, and Nvidia container toolkit.
#
# Usage: ./setup/nvidia_docker/setup.sh
# The script will guide you through different steps, each requiring a system reboot.

# Function to handle errors
handle_error() {
    echo "Error: $1"
    exit 1
}

# Function for styled echo
echo_styled() {
    echo "=== $1 ==="
}

# Function to check command execution
check_command() {
    if ! $@; then
        handle_error "Failed to execute: $@"
    fi
}

# Function to update and upgrade packages
update_packages() {
    echo_styled "Updating and upgrading packages"
    check_command sudo apt-get update
    check_command sudo apt-get upgrade -y
    check_command sudo apt-get autoremove -y
    check_command sudo apt-get autoclean -y
}

# Function to install necessary packages
install_needed_packages() {
    echo_styled "Installing necessary packages"
    check_command sudo apt-get install -y git vim curl wget tmux htop
}

# Function to install Nvidia driver
install_nvidia_driver() {
    echo_styled "Installing Nvidia driver"

    if command -v nvidia-smi &>/dev/null; then
        echo "NVIDIA driver is already installed."
        return
    fi

    echo "Checking for Nvidia GPU..."
    if ! lspci | grep -iq nvidia; then
        check_command sudo update-pciids
        if ! lspci | grep -iq nvidia; then
            echo "No NVIDIA GPU detected. Exiting..."
            exit 1
        fi
    fi

    if ! command -v gcc &>/dev/null; then
        echo "GCC not found. Installing build-essential..."
        check_command sudo apt-get install -y build-essential
    fi

    echo "Installing Nvidia driver..."
    check_command sudo apt-get install -y linux-headers-$(uname -r)
    check_command sudo apt-get install -y ubuntu-drivers-common
    check_command sudo ubuntu-drivers autoinstall
}

# Function to install CUDA toolkit
install_cuda_toolkit() {
    echo_styled "Installing CUDA toolkit"
    if command -v nvcc &>/dev/null; then
        echo "CUDA Toolkit is already installed."
        return
    fi

    local ubuntu_version=$(lsb_release -rs)
    if [ "$ubuntu_version" != "22.04" ]; then
        handle_error "Unsupported Ubuntu version. This script is for Ubuntu 22.04 LTS only."
    fi

    local distro=$(lsb_release -is | tr '[:upper:]' '[:lower:]')$(lsb_release -rs | tr -d '.')
    local arch=$(dpkg --print-architecture)
    [ "$arch" = "amd64" ] && arch="x86_64"

    echo "Adding CUDA repository for $distro $arch..."
    check_command curl -fsSL https://developer.download.nvidia.com/compute/cuda/repos/$distro/$arch/cuda-keyring_1.1-1_all.deb -o cuda-keyring.deb
    check_command sudo dpkg -i cuda-keyring.deb
    check_command rm cuda-keyring.deb
    check_command sudo apt-get update
    check_command sudo apt-get install -y cuda-toolkit nvidia-gds

    check_command export PATH=/usr/local/cuda/bin${PATH:+:${PATH}}
    check_command export LD_LIBRARY_PATH=/usr/local/cuda/lib64${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}
}

# Function to install Docker
install_docker() {
    echo_styled "Installing Docker"
    if command -v docker &>/dev/null; then
        echo "Docker is already installed."
        return
    fi

    check_command curl -fsSL https://get.docker.com -o get-docker.sh
    check_command sudo sh get-docker.sh
    check_command sudo usermod -aG docker "$USER"
    check_command rm get-docker.sh
}

# Function to install Nvidia container toolkit
install_container_toolkit() {
    echo_styled "Installing Nvidia container toolkit"
    if dpkg -s nvidia-container-toolkit &>/dev/null; then
        echo "NVIDIA Container Toolkit is already installed."
        return
    fi

    check_command curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
    check_command curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list |
        sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' |
        sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
    check_command sudo apt-get update
    check_command sudo apt-get install -y nvidia-container-toolkit

    echo "Configuring Nvidia container runtime..."
    check_command sudo nvidia-ctk runtime configure --runtime=docker
    check_command sudo systemctl restart docker

    # Can use `docker run --rm --runtime=nvidia --gpus all ubuntu nvidia-smi` to check if it works.
    # Insert "default-runtime": "nvidia" to /etc/docker/daemon.json in order to use nvidia as default runtime.
    if ! grep -q '"default-runtime": "nvidia"' /etc/docker/daemon.json; then
        check_command sudo sed -i '/"runtimes": {/i\    "default-runtime": "nvidia",' /etc/docker/daemon.json
        check_command sudo systemctl restart docker
    fi
}

# Function to perform each step
perform_step() {
    case $1 in
    1) update_packages && install_needed_packages ;;
    2) install_nvidia_driver ;;
    3) install_cuda_toolkit ;;
    4) install_docker ;;
    5) install_container_toolkit ;;
    *) handle_error "Invalid step number" ;;
    esac

    echo_styled "Step $1 finished. A system reboot is required to continue."
    read -p "Reboot now? [y/N] " choice
    [[ $choice =~ ^[Yy]$ ]] && sudo reboot
}

# Main function
main() {
    echo_styled "Nvidia Environment Setup Script for Ubuntu 22.04 LTS"
    echo "This script will guide you through the Nvidia GPU environment setup process."
    echo "Each step requires a system reboot. Please run this script again after each reboot."
    echo
    echo "Available steps:"
    echo "1. Update system and install necessary packages"
    echo "2. Install Nvidia driver"
    echo "3. Install CUDA toolkit"
    echo "4. Install Docker"
    echo "5. Install Nvidia container toolkit"
    echo "q. Quit the script"
    echo

    read -p "Enter the step number to execute (1-5) or 'q' to quit: " choice
    case $choice in
    [1-5]) perform_step $choice ;;
    q | Q)
        echo "Exiting script. Goodbye!"
        exit 0
        ;;
    *)
        echo "Invalid choice. Please try again."
        main
        ;;
    esac
}

# Script entry point
main
