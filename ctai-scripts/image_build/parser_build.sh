#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Configuration
SCRIPT_DIR="../analyzer"
IMAGE_NAME="hub.hsnl.tw/ctai/analyzer:latest"

# Function to log messages with timestamp
log() {
    echo "$(date +'%Y-%m-%d %H:%M:%S') - $1"
}

# Function to build the Docker image
build_image() {
    log "Building Docker image $IMAGE_NAME ..."

    # Check if the script directory exists
    if [[ ! -d "$SCRIPT_DIR" ]]; then
        log "Error: Directory $SCRIPT_DIR does not exist."
        exit 1
    fi

    # Change to the script directory
    cd "$SCRIPT_DIR" || {
        log "Error: Failed to change directory to $SCRIPT_DIR."
        exit 1
    }

    # Build the Docker image
    if docker build -t "$IMAGE_NAME" .; then
        log "Docker image $IMAGE_NAME built successfully."
    else
        log "Error: Docker build failed."
        exit 1
    fi
}

# Function to push the Docker image
push_image() {
    log "Pushing Docker image $IMAGE_NAME ..."

    # Uncomment the following line if you want to sign the image
    # echo "" | cosign sign --key cosign.key "$IMAGE_NAME"

    # Push the image to the registry
    if docker push "$IMAGE_NAME"; then
        log "Docker image $IMAGE_NAME pushed successfully."
    else
        log "Error: Failed to push Docker image $IMAGE_NAME."
        exit 1
    fi
}

# Main script execution
main() {
    log "Starting the Docker image build and push process for analyzer..."
    build_image
    push_image
    log "Process completed successfully."
}

# Run the main function
main
