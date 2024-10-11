#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Configuration
BASE_DIR="../ctai-models"
REGISTRY="hub.hsnl.tw/ctai"

# Function to log messages with timestamp
log() {
    echo "$(date +'%Y-%m-%d %H:%M:%S') - $1"
}

# Function to build the Docker image
build_image() {
    local model_name=$1
    local version_number=${2:-latest}
    local image_name="${REGISTRY}/${model_name}:${version_number}"
    local model_dir="${BASE_DIR}/${model_name}"

    # Check if model directory exists
    if [[ ! -d "$model_dir" ]]; then
        log "Error: Directory $model_dir does not exist."
        return 1
    fi

    log "Building Docker image ${image_name} ..."

    # Change to model directory and build image
    (cd "$model_dir" && docker build -t "$image_name" .) || {
        log "Error: Docker build failed for ${image_name}."
        return 1
    }

    log "Docker image ${image_name} built successfully."
}

# Function to push the Docker image
push_image() {
    local model_name=$1
    local version_number=${2:-latest}
    local image_name="${REGISTRY}/${model_name}:${version_number}"

    log "Pushing Docker image ${image_name} ..."

    # Uncomment the following line to sign the image with cosign
    # echo "" | cosign sign --key cosign.key "${image_name}"

    docker push "${image_name}" || {
        log "Error: Failed to push ${image_name}."
        return 1
    }

    log "Docker image ${image_name} pushed successfully."
}

# Function to get user input with default value
get_input() {
    local prompt=$1
    local default=$2
    local input

    read -p "${prompt} [${default}]: " input
    echo "${input:-$default}"
}

# Main function
main() {
    log "Starting Docker image build and push process..."

    local model_name=$(get_input "Please input the model name" "")
    if [[ -z "$model_name" ]]; then
        log "Error: Model name cannot be empty."
        exit 1
    fi

    local version_number=$(get_input "Please input the version number" "latest")

    build_image "$model_name" "$version_number" || exit 1
    push_image "$model_name" "$version_number" || exit 1

    log "Process completed successfully."
}

# Run the main function
main

# Uncomment the following line to sign the image with cosign (adjust as needed)
# echo "" | cosign sign --key cosign.key hub.hsnl.tw/ctai/yolov5
