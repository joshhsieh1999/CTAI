#!/bin/bash

# CTAI Training Task Setup and Execution Script
#
# This script sets up and initiates a training task for CTAI.
# It prepares the directory structure, converts data, creates necessary files,
# and starts the training pod in Kubernetes.
#
# Usage: ./train_task.sh <origin_data_name> <project_id> <version_id> <train_split> <val_split> <test_split> <epochs> <batch_size> <learning_rate> <image_name>

set -e

# Configuration
CONFIG_FILE="../setup/.env"
if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
else
    echo "Config file not found. Using default values."
fi

# Default values (can be overridden by config file)
PARENTS_DIR=${PARENTS_DIR:-"../mnt/training-task"}
CTAI_DATASET_DIR=${CTAI_DATASET_DIR:-"../mnt/ctai-dataset/ctai"}
SCRIPTS_DIR=${SCRIPTS_DIR:-"."}
K8S_TEMPLATE_DIR=${K8S_TEMPLATE_DIR:-"../ctai-scheduler/kubernetes/templates"}
MODEL_WEIGHTS=${MODEL_WEIGHTS:-"yolov5n.pt"}

# Command line arguments
ORIGIN_DATA_NAME=$1
PROJECT_ID=$2
VERSION_ID=$3
TRAIN_SPLIT=$4
VAL_SPLIT=$5
TEST_SPLIT=$6
EPOCHS=$7
BATCH_SIZE=$8
LEARNING_RATE=$9
IMAGE_NAME=${10}

# Derived variables
PROJECT_NAME="project-${PROJECT_ID}"
VERSION_NAME="version-${VERSION_ID}"
DATA_DIR="${PARENTS_DIR}/${PROJECT_NAME}/${VERSION_NAME}"
TARGET_DIR="${CTAI_DATASET_DIR}/${ORIGIN_DATA_NAME}"

# Function to create necessary directories
create_directory() {
    mkdir -p "${DATA_DIR}/scripts" "${DATA_DIR}/results"
}

# Function to convert data
data_convert() {
    python3 "${SCRIPTS_DIR}/dataset_convert/dataset_converter.py" \
        --input_dir "${TARGET_DIR}" \
        --output_dir "${DATA_DIR}" \
        --train "${TRAIN_SPLIT}" \
        --val "${VAL_SPLIT}" \
        --test "${TEST_SPLIT}"
}

# Function to create pod file from template
create_pod_file() {
    local template_file="${K8S_TEMPLATE_DIR}/training_job_template.yaml"
    local job_file="${DATA_DIR}/scripts/training_job.yaml"

    cp "${template_file}" "${job_file}"
    sed -i "s|{{PROJECT_NAME}}|${PROJECT_NAME}|g; s|{{VERSION_NAME}}|${VERSION_NAME}|g; s|{{IMAGE_NAME}}|${IMAGE_NAME}|g" "${job_file}"
}

# Function to copy and configure training and analysis scripts
copy_training_analyzer() {
    cp "${SCRIPTS_DIR}/config/hyp_yolov5.yaml" "${DATA_DIR}/scripts/hyp.yaml"
    cp "${SCRIPTS_DIR}/model_trainer/train_and_analyze.sh" "${SCRIPTS_DIR}/analyzer/start_and_monitor.sh" "${DATA_DIR}/scripts/"
    cp -r "${SCRIPTS_DIR}/analyzer" "${DATA_DIR}/"

    local train_script="${DATA_DIR}/scripts/train_and_analyze.sh"
    local monitor_script="${DATA_DIR}/scripts/start_and_monitor.sh"

    sed -i "s|{{VERSION_ID}}|${VERSION_ID}|g; s|{{MODEL_WEIGHTS}}|${MODEL_WEIGHTS}|g; s|{{EPOCHS}}|${EPOCHS}|g; s|{{BATCH_SIZE}}|${BATCH_SIZE}|g; s|{{IMAGE_NAME}}|${IMAGE_NAME}|g" "${train_script}"
    sed -i "s|{{IMAGE_NAME}}|${IMAGE_NAME}|g; s|{{VERSION_ID}}|${VERSION_ID}|g" "${monitor_script}"
}

# Function to set correct permissions
set_permission() {
    chmod +x "${DATA_DIR}/scripts/"* "${DATA_DIR}/analyzer/"*
}

# Function to start the training pod
start_training_pod() {
    kubectl apply -f "${DATA_DIR}/scripts/training_job.yaml"
}

# Main execution function
main() {
    create_directory
    data_convert
    create_pod_file
    copy_training_analyzer
    set_permission
    start_training_pod
}

# Execute main function with all arguments
main "$@"
