#!/bin/bash

# CTAI Kubernetes Control Plane Setup Script
#
# This script is designed for Ubuntu Server 22.04 LTS with minimum installation.
# It sets up the Control Plane of a Kubernetes cluster using Docker as the container runtime.
#
# References:
# - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
# - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
# - https://blog.jks.coffee/on-premise-self-host-kubernetes-k8s-setup/
#
# Usage: ./setup/control_plane/setup.sh {step1|step2|step3}
#   step1: Update system, prepare the enviroment, and install Docker (reboot required)
#   step2: Install Kubernetes components and initialize the cluster (reboot required)
#   step3: Install additional plugins (GPU support and Portainer)

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
    CURRENT_HOSTNAME=$(hostname)
    if [ "$CURRENT_HOSTNAME" != "control-plane" ]; then
        echo "Setting hostname to control-plane..."
        sudo hostnamectl set-hostname "control-plane"
        check_command "Failed to set hostname"
    else
        echo "Hostname is already set to control-plane."
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

# Function to initialize Kubernetes cluster
function init_k8s_cluster() {
    if [ ! -f "$HOME/.kube/config" ]; then
        echo "Initializing Kubernetes cluster..."
        echo "Enter the IP address of the control plane node: "
        read -r control_plane_ip

        sudo kubeadm init \
            --node-name=control-plane \
            --control-plane-endpoint="$control_plane_ip" \
            --pod-network-cidr=10.244.0.0/16 \
            --cri-socket='unix:///run/cri-dockerd.sock'

        echo "Configuring kubectl for the current user..."
        mkdir -p "$HOME/.kube"
        sudo cp -i /etc/kubernetes/admin.conf "$HOME/.kube/config"
        sudo chown "$(id -u):$(id -g)" "$HOME/.kube/config"
        export KUBECONFIG="$HOME/.kube/config"

        echo "Cluster initialization completed."

        # Here save the ways of commands to join the worker nodes to the cluster
        # kubeadm token list: can be used to list the available tokens
        # kubeadm token create --print-join-command: can be used to create a new token
        # - more information: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
        # - https://kubernetes.io/docs/concepts/cluster-administration/addons/

        echo "Installing Helm..."
        curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

        echo "Installing Flannel network plugin..."
        kubectl create ns kube-flannel
        kubectl label --overwrite ns kube-flannel pod-security.kubernetes.io/enforce=privileged
        helm repo add flannel https://flannel-io.github.io/flannel/
        helm install flannel --set podCidr="10.244.0.0/16" --namespace kube-flannel flannel/flannel
    else
        echo "Kubernetes cluster seems to be already initialized. Skipping initialization."
    fi
}

# Function to install GPU plugin
function install_gpu_plugin() {
    echo "Installing NVIDIA GPU plugin..."
    helm repo add nvdp https://nvidia.github.io/k8s-device-plugin
    helm repo update
    helm upgrade -i nvdp nvdp/nvidia-device-plugin \
        --namespace nvidia-device-plugin \
        --create-namespace \
        --version 0.15.0 \
        --set "plugin.passDeviceSpecs=true"
}

# Function to install GPU feature discovery
function install_gpu_feature_discovery() {
    echo "Installing GPU feature discovery..."
    helm repo add nvgfd https://nvidia.github.io/gpu-feature-discovery
    helm repo update
    helm upgrade -i nvgfd nvgfd/gpu-feature-discovery \
        --version 0.8.2 \
        --namespace gpu-feature-discovery \
        --create-namespace
}

# Replace K8s Dashboard with Portainer
# # Install K8s Dashboard
# function install_k8s_dashboard() {
#     echo "Adding K8s Dashboard to Kubernetes(by Helm)..."
#     helm repo add kubernetes-dashboard https://kubernetes.github.io/dashboard/
#     # Deploy a Helm Release named "kubernetes-dashboard" using the kubernetes-dashboard chart
#     helm upgrade -i kubernetes-dashboard kubernetes-dashboard/kubernetes-dashboard \
#         --create-namespace \
#         --namespace kubernetes-dashboard
#     # kubectl -n kubernetes-dashboard port-forward \
#     #     --address 0.0.0.0 svc/kubernetes-dashboard-kong-proxy 8443:443

#     # # Setup keys for the Kubernetes Dashboard
#     # kubectl create serviceaccount dashboard-admin-sa -n kube-system
#     # kubectl create clusterrolebinding dashboard-admin-sa \
#     #     --clusterrole=cluster-admin \
#     #     --serviceaccount=kube-system:dashboard-admin-sa
#     # kubectl -n kube-system create token dashboard-admin-sa
#     # # paste the token to the dashboard login page
# }

# Function to install Portainer
function install_portainer() {
    echo "Installing Portainer..."
    helm repo add portainer https://portainer.github.io/k8s/
    helm repo update
    helm upgrade --install portainer portainer/portainer \
        --create-namespace \
        --namespace portainer \
        --set tls.force=true
}

# Step 1: Update system and prepare environment
function step1() {
    update_packages
    install_needed_packages
    check_and_setup_environment
    install_docker

    echo "Step 1 completed. Please reboot the system to apply all changes."
    echo "Reboot now? (y/n)"
    read -r answer
    if [ "$answer" = "y" ]; then
        echo "Rebooting..."
        sudo reboot
    else
        echo "Please reboot manually to complete the setup."
    fi
}

# Step 2: Install and initialize Kubernetes
function step2() {
    install_and_setup_container_runtime
    setup_sysctl_params
    install_k8s
    check_cgroup_driver

    echo "Do you want to initialize the Kubernetes cluster now? (y/n)"
    read -r init_cluster
    if [ "$init_cluster" = "y" ]; then
        init_k8s_cluster
    else
        echo "Skipping cluster initialization. You can run it later manually."
    fi

    echo "Step 2 completed. Please reboot the system to apply all changes."
    echo "Reboot now? (y/n)"
    read -r answer
    if [ "$answer" = "y" ]; then
        echo "Rebooting..."
        sudo reboot
    else
        echo "Please reboot manually to complete the setup."
    fi
}

# Step 3: Install additional plugins
function step3() {
    echo "Do you want to install the NVIDIA GPU plugin? (y/n)"
    read -r install_gpu
    if [ "$install_gpu" = "y" ]; then
        install_gpu_plugin
        install_gpu_feature_discovery
    fi

    echo "Do you want to install Portainer? (y/n)"
    read -r install_port
    if [ "$install_port" = "y" ]; then
        install_portainer
    fi

    echo "Step 3 completed. Additional plugins have been installed as requested."
}

# Main execution
echo "CTAI Kubernetes Control Plane Setup Script"
case "$1" in
step1)
    step1
    ;;
step2)
    step2
    ;;
step3)
    step3
    ;;
*)
    echo "Usage: $0 {step1|step2|step3}"
    echo "  step1: Update system and prepare environment"
    echo "  step2: Install and initialize Kubernetes"
    echo "  step3: Install additional plugins"
    ;;
esac

# Helpful commands for cluster management:
# - Check cluster status: kubectl get nodes
# - Check pod status: kubectl get pods --all-namespaces
# - Check service status: kubectl get svc --all-namespaces
# - Check deployment status: kubectl get deployments --all-namespaces
# - Verify GPU plugin: kubectl get pods -n nvidia-device-plugin
# - Check component status: kubectl get componentstatuses
# - Detailed node info: kubectl describe node <node-name>

# Node removal:
# - Remove node: kubectl drain <node name> --delete-emptydir-data --force --ignore-daemonsets

# Remote cluster control:
# scp root@<control-plane-host>:/etc/kubernetes/admin.conf .
# kubectl --kubeconfig ./admin.conf get nodes
