import os
import json
import argparse

import official
import exp_utils
import bg_pool

def main(main_object, image_path):
    # Please replace with your OpenAI API key
    OPENAI_API_KEY="sk-xxx"     # Note: Don't push the real API key to the repository
    save_to_dir = "/home/hsnl/demo/augmented"
    generate_num_for_each_image = 1
    strength = 0.5
    cost_time = 0

    # check if the image path is a directory or a file
    if os.path.isdir(image_path):
        images = [os.path.join(image_path, f) for f in os.listdir(image_path) if os.path.isfile(os.path.join(image_path, f))]
    else:
        images = [image_path]

    for image in images:
        # 1. Encode the image to base64
        image_b64, _ = exp_utils.image_b64_encoding(image)

        # 2. Get the random background description
        background_description = bg_pool.get_random_sentence()

        # 3. Generate the new image prompt
        with open("/home/hsnl/old.bk/dogq/thesis/exp/prompt.json") as f_prompt:
            prompts = json.load(f_prompt)
        gpt_fine_tuned_prompt = prompts['ob_bg_generator']
        image_prompt_res, _, _, _, total_cost, prompt_generating_time = official.generate_prompt(
                OPENAI_API_KEY, image_b64, main_object, background_description, gpt_fine_tuned_prompt
            )
        print("prompt generating cost: ", total_cost)
        image_prompt = image_prompt_res["aug_des"]

        # 4. Generate the augmented images
        sd_pipe = official.get_diffusion_model_pipe(strength)
        image_generating_time, generated_images_list = official.generate_images(image, image_prompt, save_to_dir, generate_num_for_each_image, strength, sd_pipe)
        cost_time += (image_generating_time + prompt_generating_time)

        for i in generated_images_list:
            print(f"Image: {i} generated successfully!")

        print("-------------------")

    print(f"Total cost time: {cost_time} seconds")

if __name__ == "__main__":
    # python3 /home/hsnl/thesis/exp/main_user.py --main_object="dog" --image_path="/home/hsnl/demo/original"
    parser = argparse.ArgumentParser(description="Generate augmented images with given parameters.")
    parser.add_argument('--main_object', type=str, required=True, help='The main object for the image')
    parser.add_argument('--image_path', type=str, required=True, help='Path to the image or directory containing image paths')

    args = parser.parse_args()

    main(args.main_object, args.image_path)
