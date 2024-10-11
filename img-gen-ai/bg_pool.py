import random
from pymongo import MongoClient
from openai import OpenAI
import time
import json
import exp_utils

# This file is used to pre-built a pool of background descriptions


# Connect to MangoDB
client = MongoClient("mongodb://localhost:27017/")
db = client['sentence_database']
collection = db['sentences']
# TODO: Please add account & password for the database

def count_sentences():
    count = collection.count_documents({})
    return count

def clear_sentences():
    collection.delete_many({})
    print("All sentences have been cleared.")

def insert_sentence(sentence):
    collection.insert_one({"sentence": sentence})
    print(f"Inserted sentence: {sentence}")

def get_random_sentence():
    count = collection.count_documents({})
    if count == 0:
        return "No sentences in the database."
    random_index = random.randint(0, count - 1)
    random_sentence = collection.find().skip(random_index).limit(1)
    sentence = random_sentence.next()
    return sentence['sentence']

def generate_bg_prompt(OPENAI_API_KEY: str, image_b64: str, object_list: list, fine_tuned_prompt: str):
    """
    Args:
        OPENAI_API_KEY (str): OpenAI API Key
        image_b64 (str): Base64 encoded image
        object_list (list): User provided main object list
        fine_tuned_prompt (str): Fine tuned prompt for the chatGPT model
    
    Returns:
        dict: response from the chatGPT model

    """

    client = OpenAI(api_key=OPENAI_API_KEY)
    model_type = "gpt-4o"
    input_text = "{\"objects\": \"" + str(object_list) + "\"}"

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


if __name__ == "__main__":
    # clear_sentences()
    print(get_random_sentence())
    # OPENAI_API_KEY="sk-xxx"
    # # image_txt = "/home/hsnl/thesis/exp/datasets_txt/prepared/cat_files.txt"
    # image_txt = "/home/hsnl/thesis/exp/datasets_txt/prepared/dog_files.txt"
    # with open(image_txt, 'r') as f:
    #     images_path = f.readlines()
    #     for image_path in images_path:
    #         image_path = image_path.strip()
    #         encoded_image, image_size_str = exp_utils.image_b64_encoding(image_path)
    #         object_list = ["cat"]
    #         with open("prompt.json") as f_prompt:
    #             prompts = json.load(f_prompt)
    #         gpt_fine_tuned_prompt = prompts['bg_generator']
            
    #         response, total_tokens, prompt_tokens, completion_tokens, total_cost, elapsed_time = generate_bg_prompt(OPENAI_API_KEY, encoded_image, object_list, gpt_fine_tuned_prompt)
    #         print(response['ori_bg_des'])
    #         insert_sentence(response['ori_bg_des'])
    #         exp_utils.log_to_csv("./background_prepare_generation_log.csv", {
    #             "image_name": image_path,
    #             "image_size": image_size_str,
    #             "prompt_tokens": prompt_tokens,
    #             "completion_tokens": completion_tokens,
    #             "total_tokens": total_tokens,
    #             "total_cost": total_cost,
    #             "prompt_generating_time": elapsed_time,
    #         })

    #         print("--------------------")
    #         print(f"Total sentences: {count_sentences()}")
