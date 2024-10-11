#!/bin/bash

# CTAI Kubernetes Worker Node Setup Script
#
# This script is designed for Ubuntu Server 22.04 LTS with minimum installation.
# It sets up a Worker Node for a Kubernetes cluster using Docker as the container runtime.
#
# References:
# - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
# - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
# - https://blog.jks.coffee/on-premise-self-host-kubernetes-k8s-setup/
#
# Usage: ./setup/worker_node/setup.sh {step1|step2|step3|step4|step5}
#   step1: Update system, prepare the enviroment, and install NVIDIA driver (reboot required)

# Set the Kubernetes version
K8S_VERSION="1.29"

# Function to check if a command was successful
function check_command() {
    if [ $? -ne 0 ]; then
        echo "Error: $1"
        exit 1
    fi
}

# Function to update and upgrade system packages
function update_packages() {
    echo "Updating and upgrading system packages..."
    sudo apt-get update
    check_command "Failed to update package list"
    sudo apt-get upgrade -y
    check_command "Failed to upgrade packages"
    sudo apt-get autoremove -y && sudo apt-get autoclean -y
    check_command "Failed to clean up packages"
}

# Function to install necessary utilities
function install_needed_packages() {
    echo "Installing essential utilities..."
    sudo apt-get install -y apt-utils git vim curl wget tmux htop net-tools
    check_command "Failed to install essential utilities"
}

# Function to check and set up the environment
function check_and_setup_environment() {
    echo "Checking and setting up the server environment..."

    # Check for unique MAC address and product UUID
    MAC_ADDRESS=$(ip link show | grep "link/ether" | awk '{print $2}' | head -n 1)
    PRODUCT_UUID=$(sudo cat /sys/class/dmi/id/product_uuid)
    echo "MAC Address: $MAC_ADDRESS"
    echo "Product UUID: $PRODUCT_UUID"

    # Set hostname
    echo "Please enter the hostname for this server: worker-node-<num>-<gpu_name> (e.g., worker-node-1-rtx4090):"
    read -r hostname
    CURRENT_HOSTNAME=$(hostname)
    if [ "$(hostname)" != "$hostname" ]; then
        sudo hostnamectl set-hostname "$hostname"
        check_command "Failed to set hostname"
    else
        echo "Hostname is already set to $hostname."
    fi

    # Check if swap is already disabled
    if [ "$(swapon --show)" ]; then
        echo "Swap is currently enabled. Attempting to disable..."
        # Disable swap
        sudo swapoff -a
        sudo sed -i '/[[:space:]]swap[[:space:]]/ s/^/#/' /etc/fstab

        # Check if swap is now disabled
        if [ "$(swapon --show)" ]; then
            echo "Error: Unable to fully disable swap. Please manually check and disable swap, then run the script again."
            echo "You can use the following command to check swap status: 'swapon --show'"
            echo "Common methods to disable swap include:"
            echo "1. Edit /etc/fstab file and comment out all swap-related lines"
            echo "2. Run 'sudo swapoff -a' command"
            echo "3. If using a swapfile, you can delete it: 'sudo rm /swapfile'"
            echo "After completing these steps, please reboot the system and run this script again."
            exit 1
        else
            echo "Swap has been successfully disabled."
        fi
    else
        echo "Swap is already disabled. Skipping this step."
    fi
}

# Function to install NVIDIA driver
function install_nv_driver() {
    if command -v nvidia-smi &>/dev/null; then
        echo "NVIDIA driver is already installed."
        return
    fi

    echo "Checking for NVIDIA GPU..."
    if ! lspci | grep -iq nvidia; then
        sudo update-pciids
        if ! lspci | grep -iq nvidia; then
            echo "No NVIDIA GPU detected. Exiting..."
            exit 1
        fi
    fi

    if ! command -v gcc &>/dev/null; then
        echo "Installing build-essential package..."
        sudo apt-get install -y build-essential
        check_command "Failed to install build-essential package"
    fi

    echo "Installing NVIDIA driver..."
    sudo apt-get install -y linux-headers-$(uname -r) ubuntu-drivers-common
    sudo ubuntu-drivers autoinstall
    check_command "Failed to install NVIDIA driver"
}

# Function to install CUDA Toolkit
function install_cuda_toolkit() {
    if command -v nvcc &>/dev/null; then
        echo "CUDA Toolkit is already installed."
        return
    fi

    echo "Installing CUDA Toolkit..."
    local ubuntu_version=$(lsb_release -rs)
    if [ "$ubuntu_version" != "22.04" ]; then
        echo "Unsupported Ubuntu version. Please install CUDA Toolkit manually."
        exit 1
    fi

    local distro=$(lsb_release -is | tr '[:upper:]' '[:lower:]')$(lsb_release -rs | tr -d '.')
    local arch=$(dpkg --print-architecture)
    if [ "$arch" = "amd64" ]; then
        arch="x86_64"
    fi

    curl -fsSL https://developer.download.nvidia.com/compute/cuda/repos/$distro/$arch/cuda-keyring_1.1-1_all.deb -o cuda-keyring.deb
    sudo dpkg -i cuda-keyring.deb
    rm cuda-keyring.deb
    sudo apt-get update
    sudo apt-get install -y cuda-toolkit nvidia-gds

    export PATH=/usr/local/cuda/bin${PATH:+:${PATH}}
    export LD_LIBRARY_PATH=/usr/local/cuda/lib64${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}
}

# Function to install Docker
function install_docker() {
    if command -v docker &>/dev/null; then
        echo "Docker is already installed."
        return
    fi

    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    check_command "Failed to install Docker"

    sudo usermod -aG docker "$USER"
    rm get-docker.sh
}

# Function to install NVIDIA Container Toolkit
function install_container_toolkit() {
    if dpkg -s nvidia-container-toolkit &>/dev/null; then
        echo "NVIDIA Container Toolkit is already installed."
        return
    fi

    echo "Installing NVIDIA Container Toolkit..."
    curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
    curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list |
        sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' |
        sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
    sudo apt-get update
    sudo apt-get install -y nvidia-container-toolkit
    sudo nvidia-ctk runtime configure --runtime=docker
    sudo systemctl restart docker

    # Can use `docker run --rm --runtime=nvidia --gpus all ubuntu nvidia-smi` to check if it works.
    # Insert "default-runtime": "nvidia" to /etc/docker/daemon.json in order to use nvidia as default runtime.
    if ! grep -q '"default-runtime": "nvidia"' /etc/docker/daemon.json; then
        sudo sed -i '/"runtimes": {/i\    "default-runtime": "nvidia",' /etc/docker/daemon.json
        sudo systemctl restart docker
    fi
}

# Function to install and set up container runtime
function install_and_setup_container_runtime() {
    if command -v cri-dockerd &>/dev/null; then
        echo "cri-dockerd is already installed. Skipping installation."
        return
    fi

    echo "Installing cri-dockerd..."
    curl -L https://github.com/Mirantis/cri-dockerd/releases/download/v0.3.12/cri-dockerd_0.3.12.3-0.ubuntu-jammy_amd64.deb -o cri-dockerd.deb
    sudo dpkg -i cri-dockerd.deb
    sudo systemctl daemon-reload
    sudo systemctl enable --now cri-docker.service
    rm cri-dockerd.deb

    echo "Setting up container runtime configuration..."
    cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

    sudo modprobe overlay
    sudo modprobe br_netfilter
}

# Function to set up system parameters
function setup_sysctl_params() {
    echo "Configuring system parameters for Kubernetes..."
    if [ ! -f /etc/sysctl.d/k8s.conf ]; then
        cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF
        sudo sysctl --system
    else
        echo "Kubernetes system parameters are already configured. Skipping."
    fi

    echo "Verifying network configurations..."
    lsmod | grep br_netfilter
    lsmod | grep overlay
    sysctl net.bridge.bridge-nf-call-iptables net.bridge.bridge-nf-call-ip6tables net.ipv4.ip_forward
}

# Function to install Kubernetes components
function install_k8s() {
    # Install kubeadm, kubelet, and kubectl
    # This script below is for installing Kubernetes 1.29.0 from the official Kubernetes documentation.
    # - https://v1-29.docs.kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/

    if ! command -v kubectl &>/dev/null; then
        echo "Installing Kubernetes components (version $K8S_VERSION)..."
        sudo apt-get update
        sudo apt-get install -y apt-transport-https ca-certificates curl gpg

        sudo mkdir -p -m 755 /etc/apt/keyrings
        curl -fsSL https://pkgs.k8s.io/core:/stable:/v${K8S_VERSION}/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

        # This overwrites any existing configuration in /etc/apt/sources.list.d/kubernetes.list
        echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v${K8S_VERSION}/deb/ /" | sudo tee /etc/apt/sources.list.d/kubernetes.list

        sudo apt-get update
        sudo apt-get install -y kubelet kubeadm kubectl
        sudo apt-mark hold kubelet kubeadm kubectl

        # (Optional) Enable the kubelet service before running kubeadm.
        sudo systemctl enable --now kubelet
    else
        echo "Kubernetes components are already installed. Skipping installation."
    fi
}

# Function to check and configure cgroup drivers
function check_cgroup_driver() {
    echo "Checking and configuring cgroup drivers..."

    # Check Docker cgroup driver
    docker_cgroup_driver=$(docker info | grep -i "cgroup driver" | awk '{print $3}')
    if [ "$docker_cgroup_driver" != "systemd" ]; then
        echo "Setting Docker cgroup driver to systemd..."
        sudo mkdir -p /etc/docker
        cat <<EOF | sudo tee /etc/docker/daemon.json
{
    "exec-opts": ["native.cgroupdriver=systemd"],
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "100m"
    },
    "storage-driver": "overlay2"
}
EOF
        sudo systemctl restart docker
    else
        echo "Docker cgroup driver is already set to systemd."
    fi

    # Check kubelet cgroup driver
    if ! grep -q "KUBELET_EXTRA_ARGS=--cgroup-driver=systemd" /etc/default/kubelet; then
        echo "Setting kubelet cgroup driver to systemd..."
        echo 'KUBELET_EXTRA_ARGS="--cgroup-driver=systemd"' | sudo tee -a /etc/default/kubelet
        sudo systemctl daemon-reload
        sudo systemctl restart kubelet
    else
        echo "Kubelet cgroup driver is already set to systemd."
    fi

    echo "Kubernetes component versions:"
    kubectl version --client
    kubeadm version
    kubelet --version
}

# Main execution functions for each step
function step1() {
    update_packages
    install_needed_packages
    check_and_setup_environment
    install_nv_driver
}

function step2() {
    install_cuda_toolkit
}

function step3() {
    install_docker
}

function step4() {
    install_container_toolkit
}

function step5() {
    install_and_setup_container_runtime
    setup_sysctl_params
    install_k8s
    configure_cgroup_drivers
}

# Function to ask for reboot
function ask_reboot() {
    echo "Setup completed. A reboot is recommended to apply all changes."
    read -p "Do you want to reboot now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Rebooting..."
        sudo reboot
    else
        echo "Please reboot manually to complete the setup."
    fi
}

# Main execution
echo "CTAI Kubernetes Worker Node Setup Script"
case "$1" in
step1)
    step1
    ask_reboot
    ;;
step2)
    step2
    ask_reboot
    ;;
step3)
    step3
    ask_reboot
    ;;
step4)
    step4
    ask_reboot
    ;;
step5)
    step5
    ask_reboot
    ;;
*)
    echo "Usage: $0 {step1|step2|step3|step4|step5}"
    echo "  step1: Update system, install NVIDIA driver"
    echo "  step2: Install CUDA Toolkit"
    echo "  step3: Install Docker"
    echo "  step4: Install NVIDIA Container Toolkit"
    echo "  step5: Setup container runtime, install Kubernetes components"
    exit 1
    ;;
esac
