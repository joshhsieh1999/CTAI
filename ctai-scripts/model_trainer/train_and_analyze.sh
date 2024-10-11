#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Configuration
API_ENDPOINT="http://192.168.2.94/api/versions/{{VERSION_ID}}"
RESULTS_DIR="./results"
DONE_FILE="${RESULTS_DIR}/done"
FAIL_FILE="${RESULTS_DIR}/fail"
LOG_FILE="${RESULTS_DIR}/training.log"

# Script parameters (can be overridden by environment variables)
MODEL_WEIGHTS={{MODEL_WEIGHTS}}
EPOCHS={{EPOCHS}}
BATCH_SIZE={{BATCH_SIZE}}
# SLEEP_DURATION=${SLEEP_DURATION:-300}  # 5 minutes
SLEEP_DURATION=300 # 5 minutes

# Log function
log() {
    echo "$(date +'%Y-%m-%d %H:%M:%S') - $1" | tee -a "${LOG_FILE}"
}

# Error handling function
handle_error() {
    log "Error occurred on line $1"
    touch "${FAIL_FILE}"
    exit 1
}

# Set up error handling
trap 'handle_error $LINENO' ERR

# Update status function
update_status() {
    local status=$1
    if curl --data "{\"status\": \"${status}\"}" -X PATCH "${API_ENDPOINT}"; then
        log "Status updated to ${status}"
    else
        log "Failed to update status to ${status}"
    fi
}

# Training function
start_training() {
    log "Starting training..."
    wandb offline && wandb enabled
    python model/train.py \
        --weights "${MODEL_WEIGHTS}" \
        --data dataset/dataset.yaml \
        --epochs "${EPOCHS}" \
        --project results \
        --batch-size "${BATCH_SIZE}" \
        --device 0 \
        --hyp "scripts/hyp.yaml" \
        --exist-ok
}

# Post-processing function
post_process() {
    log "Training completed. Starting post-processing..."

    # Validation
    python model/val.py \
        --weights results/exp/weights/last.pt \
        --data dataset/dataset.yaml \
        --task test \
        --save-txt \
        --save-conf \
        --project results \
        --name test \
        --device 0 \
        --exist-ok \
        --verbose

    # Model export
    log "Exporting model..."
    (
        cd "./dataset" &&
            python "../model/export.py" \
                --data dataset.yaml \
                --weights "../results/exp/weights/last.pt" \
                --int8 \
                --nms \
                --agnostic-nms \
                --include tflite \
                --device 0
    )
}

# Main function
main() {
    log "Script started"
    log "Python version: $(python --version 2>&1)"

    log "Sleeping for ${SLEEP_DURATION} seconds..."
    sleep "${SLEEP_DURATION}"

    update_status "Training"
    start_training
    post_process

    log "Creating done file..."
    touch "${DONE_FILE}"

    log "Script execution completed successfully."
}

# Run the main function
main
