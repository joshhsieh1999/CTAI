#!/bin/bash

# Configuration
API_ENDPOINT="http://192.168.2.94/api/versions/{{VERSION_ID}}"
WORKSPACE_DIR="/workspace"
RESULTS_DIR="${WORKSPACE_DIR}/results"
DONE_FILE="${RESULTS_DIR}/done"
FAIL_FILE="${RESULTS_DIR}/fail"
LOG_FILE="${RESULTS_DIR}/post-processing.log"
analyzer_DIR="${WORKSPACE_DIR}/analyzer"
IMAGE_NAME="{{IMAGE_NAME}}"

# Update status function
update_status() {
    local status=$1
    curl --data "{\"status\": \"${status}\"}" -X PATCH "${API_ENDPOINT}"
}

# Log function
log_message() {
    local message=$1
    echo "$(date +'%Y-%m-%d %H:%M:%S') - ${message}" | tee -a "${LOG_FILE}"
}

# Execute Python script function
run_python_script() {
    local script_name=$1
    shift
    log_message "Starting ${script_name} at $(date +%T.%6N)"
    python "${analyzer_DIR}/${script_name}" "$@" >>"${LOG_FILE}" 2>&1
    log_message "Finished ${script_name} at $(date +%T.%6N)"
}

# Start crontab and cron daemon
start_cron() {
    log_message "Starting crontab... at $(date +%T.%6N)"
    crontab "${analyzer_DIR}/analysis_crontab"
    log_message "Starting cron daemon... at $(date +%T.%6N)"
    cron
}

# Stop cron
stop_cron() {
    log_message "Stopping cron and removing crontab..."
    crontab -r
    pkill cron
}

# Post-processing function
run_post_processing() {
    log_message "Starting post-processing"

    run_python_script "yolo_to_voc.py" -gt
    run_python_script "yolo_to_voc.py" -pred
    run_python_script "all_class_AP.py" -na -np
    run_python_script "confusion_matrix.py"
    run_python_script "dataset_check.py"
    run_python_script "train_performance.py" -t "${IMAGE_NAME}"

    log_message "Finished post-processing"
}

# Error handling function
handle_error() {
    log_message "Error occurred. Updating status to Failed."
    update_status "Failed"
    exit 1
}

# Main execution
main() {
    start_cron

    while true; do
        if [ -f "${FAIL_FILE}" ]; then
            log_message "Fail file detected. Stopping all operations."
            stop_cron
            handle_error
        elif [ -f "${DONE_FILE}" ]; then
            log_message "Done file detected. Starting post-processing."
            stop_cron
            run_post_processing
            update_status "Finish"
            log_message "Post-processing completed successfully."
            exit 0
        fi
        sleep 5
    done
}

# Set up error handling
set -e
trap 'handle_error' ERR

# Run the main function
main
