from openai import OpenAI

import time
import json
import csv

from diffusers import AutoPipelineForImage2Image
from diffusers.utils import load_image
from diffusers.utils import logging

logging.set_verbosity(logging.CRITICAL)


import torch
import os
import uuid
import pandas as pd

# self defined modules
import exp_utils
import bg_pool


def log_base_image_prompt_mapping(log_file, log_data):
    fieldnames = ["base_image_name", "prompt"]
    file_exists = os.path.isfile(log_file)
    with open(log_file, 'a', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow(log_data)


def generate_prompt(OPENAI_API_KEY: str, image_b64: str, object_list: list, background_description: str, fine_tuned_prompt: str):
    """
    Args:
        OPENAI_API_KEY (str): OpenAI API Key
        image_b64 (str): Base64 encoded image
        object_list (list): User provided main object list
        background_description (str): Description of the background to generate new image prompt, "" means no background description
        fine_tuned_prompt (str): Fine tuned prompt for the chatGPT model
    
    Returns:
        dict: response from the chatGPT model

    """

    client = OpenAI(api_key=OPENAI_API_KEY)
    model_type = "gpt-4o"
    if background_description == "":
        input_text = "{\"objects\": \"" + str(object_list) + "\"}"
    else:
        input_text = "{\"objects\": \"" + str(object_list) + "\", \"selected_background\": \"" + background_description + "\"}"

    start_time = time.time()

    response = client.chat.completions.create(
        model=model_type,
        messages=[
            {"role": "system", "content": fine_tuned_prompt},
            {
                "role": "user", 
                "content": [
                    { "type": "text", "text": input_text },
                    {
                        "type": "image_url",
                        "image_url": { 
                            "url": f"data:image/jpeg;base64,{image_b64}",
                        }
                    }
                ],
            },
        ],
        stream=False,
    )

    elapsed_time = time.time() - start_time
    print(f"ChatGPT analyse time: {elapsed_time} seconds")

    usage_info = response.usage
    prompt_tokens = usage_info.prompt_tokens
    completion_tokens = usage_info.completion_tokens
    total_tokens = usage_info.total_tokens

    print(f"Total tokens: {total_tokens}, prompt tokens: {prompt_tokens}, completion tokens: {completion_tokens}")

    # calculate the usage cost
    total_cost = exp_utils.openAI_cost_count(prompt_tokens, completion_tokens, model=model_type)

    print(response.choices[0].message.content)

    try:
        res = json.loads(response.choices[0].message.content)
    except Exception as e:
        print("chatGPT model not responds json string.")
        raise e
    
    return res, total_tokens, prompt_tokens, completion_tokens, total_cost, elapsed_time

def get_diffusion_model_pipe(strength):
    model = "sd-turbo"
    # model = "sdxl-turbo"
    model_name = f"stabilityai/{model}"

    #### parameters for generate images
    guidance_scale = 0.0    # percentage of prompt influence on the output image
    num_inference_steps = 10 # number of inference steps, how detailed the output image is
    # strength = 0.5         # strength of the output image
    ####

    pipe = AutoPipelineForImage2Image.from_pretrained(model_name, torch_dtype=torch.float16, variant="fp16")
    pipe.to("cuda")

    return pipe


def generate_images(image_path, prompt, save_to_dir, generate_num, strength, pipe):
    # check if the save_to_dir exists, if not create it
    if not os.path.exists(save_to_dir):
        os.makedirs(save_to_dir)
        print("Directory not exists. Creating...")
        print("Directory ", save_to_dir, " Created" )
    
    random_uuid = str(uuid.uuid4())
    image_name_full = os.path.basename(image_path)
    image_name = os.path.splitext(image_name_full)[0]

    
    generated_images_list = []
    #### parameters for generate images
    guidance_scale = 0.0    # percentage of prompt influence on the output image
    num_inference_steps = 10 # number of inference steps, how detailed the output image is
    # strength = 0.5         # strength of the output image
    ####
    
    init_image = load_image(image_path)

    start = time.time()
    for i in range(generate_num):
        try:
            image = pipe(prompt, image=init_image, num_inference_steps=num_inference_steps, strength=strength, guidance_scale=guidance_scale).images[0]
            generated_image_name = f"{image_name}_{num_inference_steps}_{strength}_{random_uuid}.png"
            generated_images_list.append(generated_image_name)
            image.save(f"{save_to_dir}/{generated_image_name}")
        except torch.cuda.OutOfMemoryError:
            print(f"Iteration {i}: CUDA out of memory. Skipping this iteration.")
            with open("/home/hsnl/thesis/exp/logs/oom.txt", 'a') as txt_file:
                txt_file.write(f"{image_path}\n")
            torch.cuda.empty_cache()  # 清空緩存以釋放一些 GPU 內存
            continue
        

    duration = time.time() - start
    print(f"Generate images time: {duration} seconds")

    return duration, generated_images_list


if __name__ == "__main__":
    # Here is just for exprimenting the image generation process
    # Also exmaples of how to use the functions in this file

    # Please replace with your OpenAI API key
    OPENAI_API_KEY="sk-xxx"     # Note: Don't push the real API key to the repository
    classes = ["Bird-Drop", "Clean", "Dusty", "Physical-Damage", "Snow-Covered"]
    # proportion = [0.2, 0.5, 1.0]
    proportion = 1.0
    log_base_image_prompt_mapping_file = "/home/hsnl/thesis/exp/logs/base_image_prompt_mapping.csv"
    class_object_mapping = {
        "Bird-Drop": "Bird Droppings on Solar Panel",
        "Clean": "Clean Solar Panel",
        "Dusty": "Dusty on Solar Panel",
        "Physical-Damage": "Physical Damaged on Solar Panel",
        "Snow-Covered": "Snow Covered on Solar Panel"
    }

    # generate images from existing prompt file

    # 1. read prompts from file
    prompts_df = pd.read_csv(log_base_image_prompt_mapping_file)

    for data_class in classes:
        images_txt_path = f'/home/hsnl/thesis/exp/datasets_txt/basic/{proportion}/{data_class}.txt'
        log_file = f'/home/hsnl/thesis/exp/logs/{proportion}/{data_class}_{proportion}_augmented.csv'

        with open(images_txt_path, 'r') as file:
            image_files = file.readlines()
            for image_file in image_files:
                image_file = image_file.strip()
                image_name = os.path.basename(image_file)
                # Find the prompt for the image
                prompt = prompts_df[prompts_df['base_image_name'] == image_name]['prompt'].values
                if len(prompt) > 0:
                    image_prompt = prompt[0]
                else:
                    continue

                image_b64, image_size_str = exp_utils.image_b64_encoding(image_file)
                generate_num_for_each_image = 1

                exp_strength = [0.4, 0.6]
                for k in exp_strength:
                    for times in range(2, 3):
                        save_to_dir = f"/home/hsnl/thesis/datasets/Faulty_solar_panel/augmented_exp/{proportion}_same_prompt/{k}/{data_class}_augmented_{times}"
                        generated_images_txt_path = f'/home/hsnl/thesis/exp/datasets_txt/augmented/{proportion}/{k}/{data_class}_{times}.txt'
                        generated_images = []
                        
                        sd_pipe = get_diffusion_model_pipe(k)

                        image_generating_time, generated_images_list = generate_images(image_file, image_prompt, save_to_dir, generate_num_for_each_image, k, sd_pipe)

                        if not os.path.exists(os.path.dirname(generated_images_txt_path)):
                            os.makedirs(os.path.dirname(generated_images_txt_path))
                            print("Directory not exists. Creating...")
                            print("Directory ", os.path.dirname(generated_images_txt_path), " Created" )
                            
                        with open(generated_images_txt_path, 'a') as txt_file:
                            for image in generated_images_list:
                                txt_file.write(os.path.abspath(os.path.join(save_to_dir, image)) + '\n')

                        log_data = {
                            "image_name": image_name,
                            "image_size": image_size_str,
                            "image_generating_time": image_generating_time,
                            "strength": k,
                        }

                        if not os.path.exists(os.path.dirname(log_file)):
                            os.makedirs(os.path.dirname(log_file))
                            print("Directory not exists. Creating...")
                            print("Directory ", os.path.dirname(log_file), " Created" )

                        exp_utils.log_to_csv(log_file, log_data)
                        print(f"Image {image_name} with strength {k} generated.")



    # generate images for each class from initial images
    # for data_class in classes:
    #     images_txt_path = f'/home/hsnl/thesis/exp/datasets_txt/basic/{proportion}/{data_class}_{proportion}.txt'

    #     log_file = f'/home/hsnl/thesis/exp/logs/{proportion}/{data_class}_{proportion}_augmented.csv'

    #     # read images.txt and get image path from it and use it in b64 encoding
    #     with open(images_txt_path, 'r') as f:
    #         images_path = f.readlines()
    #         for image_path in images_path:
    #             image_path = image_path.strip()
    #             image_b64, image_size_str = exp_utils.image_b64_encoding(image_path)

    #             object_list = [class_object_mapping[data_class]]
    #             background_description = bg_pool.get_random_sentence()
                
    #             with open("prompt.json") as f_prompt:
    #                 prompts = json.load(f_prompt)
    #             gpt_fine_tuned_prompt = prompts['ob_bg_generator']
                
    #             image_prompt_res, total_tokens, prompt_tokens, completion_tokens, total_cost, prompt_generating_time = generate_prompt(
    #                 OPENAI_API_KEY, image_b64, object_list, background_description, gpt_fine_tuned_prompt
    #             )

    #             image_prompt = image_prompt_res["aug_des"]
    #             log_base_image_prompt_mapping(log_base_image_prompt_mapping_file, {
    #                 "base_image_name": os.path.basename(image_path),
    #                 "prompt": image_prompt
    #             })

    #             generate_num_for_each_image = 1

    #             # exp_strength = [0.4, 0.5, 0.6]
    #             exp_strength = [0.5]
    #             for k in exp_strength:
    #                 save_to_dir = f"/home/hsnl/thesis/datasets/Faulty_solar_panel/exp/{proportion}_same_prompt/{k}/{data_class}_augmented"
    #                 generated_images_txt_path = f'/home/hsnl/thesis/exp/datasets_txt/augmented/{proportion}/{k}/{data_class}_generated_images.txt'
    #                 generated_images = []
                    
    #                 sd_pipe = get_diffusion_model_pipe(k)
    #                 try:
    #                     image_generating_time, generated_images_list = generate_images(image_path, image_prompt, save_to_dir, generate_num_for_each_image, k, sd_pipe)
    #                 except torch.cuda.OutOfMemoryError:
    #                     print(f"Skipping image generation for {image_path} due to CUDA out of memory.")
    #                     with open("/home/hsnl/thesis/exp/logs/oom.txt", 'a') as txt_file:
    #                         txt_file.write(f"{image_path}\n")
    #                     torch.cuda.empty_cache() 
    #                     continue
        
    #                 image_name = os.path.basename(image_path)

    #                 if not os.path.exists(os.path.dirname(generated_images_txt_path)):
    #                     os.makedirs(os.path.dirname(generated_images_txt_path))
    #                     print("Directory not exists. Creating...")
    #                     print("Directory ", os.path.dirname(generated_images_txt_path), " Created" )
                        
    #                 with open(generated_images_txt_path, 'a') as txt_file:
    #                     for image in generated_images_list:
    #                         txt_file.write(os.path.abspath(os.path.join(save_to_dir, image)) + '\n')

    #                 log_data = {
    #                     "image_name": image_name,
    #                     "image_size": image_size_str,
    #                     "prompt_tokens": prompt_tokens,
    #                     "completion_tokens": completion_tokens,
    #                     "total_tokens": total_tokens,
    #                     "total_cost": total_cost,
    #                     "prompt_generating_time": prompt_generating_time,
    #                     "image_generating_time": image_generating_time,
    #                     "strength": k,
    #                 }

    #                 if not os.path.exists(os.path.dirname(log_file)):
    #                     os.makedirs(os.path.dirname(log_file))
    #                     print("Directory not exists. Creating...")
    #                     print("Directory ", os.path.dirname(log_file), " Created" )

    #                 exp_utils.log_to_csv(log_file, log_data)
    #                 print(f"Image {image_name} with strength {k} generated.")

                
        
