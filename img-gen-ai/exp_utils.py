import base64
from PIL import Image
import time
import os
import csv

def image_b64_encoding(image_path):
    start_time = time.time()
    with open(image_path, 'rb') as image_file:
        encoded_image = base64.b64encode(image_file.read()).decode('utf-8')

    elapsed_time = time.time() - start_time
    print(f"Base64 encoding image time: {elapsed_time} seconds")

    with Image.open(image_path) as img:
        width, height = img.size
        image_size_str = f"{width}x{height}"

    return encoded_image, image_size_str


def openAI_cost_count(prompt_tokens: int, completion_tokens: int, model="gpt-4o"):
    """_summary_

    Args:
        prompt_tokens: input token numbers
        completion_tokens: output token numbers
        model: model used in chatGPT API. Defaults to "gpt-4o".

    Returns:
        float: total request cost
    """
    # recorded on 2024/06/23
    model_cost = {
        "gpt-4o" : {
            "cost_per_1k_input_tokens": 0.005,
            "cost_per_1k_output_tokens": 0.015
        },
        "gpt-3.5-turbo" : {
            "cost_per_1k_input_tokens": 0.0005,
            "cost_per_1k_output_tokens": 0.0015
        }
    }

    input_cost = prompt_tokens / 1000 * model_cost[model]['cost_per_1k_input_tokens']
    output_cost = completion_tokens / 1000 * model_cost[model]['cost_per_1k_output_tokens']
    total_text_cost = input_cost + output_cost

    print(f"total_text_cost: {total_text_cost}")

    return total_text_cost\
    
def log_to_csv(log_file, log_data):
    fieldnames = ["image_name", "image_size", "prompt_tokens", "completion_tokens", "total_tokens", "total_cost", "prompt_generating_time", "image_generating_time", "strength"]
    file_exists = os.path.isfile(log_file)
    with open(log_file, 'a', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow(log_data)