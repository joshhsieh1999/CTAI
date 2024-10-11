import argparse
import os
import random
import shutil
import sys
import glob
import asyncio
import zipfile

class_mapping = {}
cur_num_classes = 0
lock = asyncio.Lock()


async def unzip_and_process(zip_path, tmp_dir, output_dir):
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        extract_to = os.path.join(
            tmp_dir, os.path.splitext(os.path.basename(zip_path))[0])
        zip_ref.extractall(path=extract_to)
    print(f"Unzipped {zip_path} successfully")
    await process_task(extract_to, output_dir)


async def process_task(src_dir, output_dir):
    async with lock:
        global cur_num_classes
        local_class_mapping = []
        try:
            with open(os.path.join(src_dir, 'obj.names'), 'r') as file:
                for line in file:
                    class_name = line.strip()
                    local_class_mapping.append(class_name)
                    if class_name and class_name not in class_mapping:
                        class_mapping[class_name] = cur_num_classes
                        cur_num_classes += 1
                        print(f"Updated class mapping: {class_mapping}")
        except FileNotFoundError:
            print(f"No obj.names file in {src_dir}, skipping...")
            return
        
        # label_files = glob.glob(os.path.join(
        #     src_dir, 'obj_train_data', '*.txt'))
        
        # find all .txt files in the obj_train_data and obj_train_data/*/ directories
        label_files = glob.glob(os.path.join(src_dir, 'obj_train_data', '**', '*.txt'), recursive=True)
        
        for label_file in label_files:
            with open(label_file, 'r') as file:
                for line in file:
                    class_id, x, y, w, h = line.split()
                    mapped_id = class_mapping[local_class_mapping[int(
                        class_id)]]
                    output_file_path = os.path.join(
                        output_dir, 'labels', os.path.basename(label_file))
                    with open(output_file_path, 'a') as out_file:
                        out_file.write(f"{mapped_id} {x} {y} {w} {h}\n")


async def unzip_files_async(annotations_dir, tmp_dir, output_dir):
    zip_files = glob.glob(os.path.join(annotations_dir, '*.zip'))
    print(f"Found {len(zip_files)} zip files in {annotations_dir}")
    tasks = [unzip_and_process(zip_path, tmp_dir, output_dir)
             for zip_path in zip_files]
    await asyncio.gather(*tasks)


def prepare_files(input_dir, output_dir, use_symlink, train, val, test):
    # Ensure the output directory exists
    label_dir = os.path.join(output_dir, 'labels')
    os.makedirs(label_dir, exist_ok=True)

    # Path to the image folder inside the input directory
    input_img_dir = os.path.join(input_dir, 'images')

    # Check if the image folder exists
    if not os.path.exists(input_img_dir):
        print(
            f"No 'images' folder found in the specified input directory: {input_img_dir}")
        return

    output_img_dir = os.path.join(output_dir, 'images')

    if use_symlink:
        # Create a symlink for the images folder

        # if the output_img_dir exists and is not a symlink, remove it
        if os.path.exists(output_img_dir) and not os.path.islink(output_img_dir):
            shutil.rmtree(output_img_dir)

        if not os.path.exists(output_img_dir):
            try:
                os.symlink(input_img_dir, output_img_dir,
                           target_is_directory=True)
                print(
                    f"Symlink created for images directory at {output_img_dir}")
            except OSError as e:
                print(f"Failed to create symlink: {e}")
                sys.exit(1)
    else:
        # Copy the images folder
        if os.path.exists(output_img_dir):
            if os.path.islink(output_img_dir):
                os.unlink(output_img_dir)
            else:
                shutil.rmtree(output_img_dir)
        shutil.copytree(input_img_dir, output_img_dir)

    # remove CVAT manifest file if exists
    if os.path.exists(os.path.join(output_img_dir, 'manifest.jsonl')):
        os.remove(os.path.join(output_img_dir, 'manifest.jsonl'))
    # create train, val, test txt files
    train_file = open(os.path.join(output_dir, 'train.txt'), 'w')
    val_file = open(os.path.join(output_dir, 'val.txt'), 'w')
    test_file = open(os.path.join(output_dir, 'test.txt'), 'w')

    file_names = os.listdir(output_img_dir)
    # Close the train, val, test files
    train_file.close()
    val_file.close()
    test_file.close()

    # Iterate over each file in the image folder
    for file_name in file_names:
        base_name = os.path.splitext(file_name)[0]
        text_file_path = os.path.join(label_dir, f"{base_name}.txt")
        open(text_file_path, 'w').close()

    random.seed(42)
    random.shuffle(file_names)
    num_files = len(file_names)
    train_end = int(num_files * train)
    val_end = int(num_files * (train + val))
    for i, file_name in enumerate(file_names):
        if i < train_end:
            with open(os.path.join(output_dir, 'train.txt'), 'a') as file:
                file.write(f"./images/{file_name}\n")
        elif i < val_end:
            with open(os.path.join(output_dir, 'val.txt'), 'a') as file:
                file.write(f"./images/{file_name}\n")
        else:
            with open(os.path.join(output_dir, 'test.txt'), 'a') as file:
                file.write(f"./images/{file_name}\n")


def create_dataset_yaml(output_dir):
    with open(os.path.join(output_dir, 'dataset.yaml'), 'w') as file:
        file.write(f"path: ../dataset\n")
        file.write(f"train: train.txt\n")
        file.write(f"val: val.txt\n")
        file.write(f"test: test.txt\n\n")
        file.write(f"names:\n")
        for class_name, class_id in class_mapping.items():
            file.write(f"  {class_id}: {class_name}\n")


def main():
    parser = argparse.ArgumentParser(
        description='Create text files for images.')
    parser.add_argument('-id', '--input_dir', required=True,
                        help='Directory containing the images folder.')
    parser.add_argument('-od', '--output_dir', required=True,
                        help='Directory where label text files will be created.')
    parser.add_argument('--sym-link', action='store_true', default=False,
                        help='Create a symlink instead of copying the images folder.')
    parser.add_argument('--train', type=float, default=0.8,
                        help='Percentage of data for training.')
    parser.add_argument('--val', type=float, default=0.1,
                        help='Percentage of data for validation.')
    parser.add_argument('--test', type=float, default=0.1,
                        help='Percentage of data for testing.')

    args = parser.parse_args()
    args.output_dir = os.path.join(args.output_dir, 'dataset')
    # if (os.path.exists(args.output_dir)):
    #     shutil.rmtree(args.output_dir, ignore_errors=True)
    if os.path.exists(args.output_dir):
        print(f"Output directory {args.output_dir} already exists. Exiting.")
        return

    prepare_files(args.input_dir, args.output_dir,
                  args.sym_link, args.train, args.val, args.test)
    annotations_dir = os.path.join(args.input_dir, 'annotations')
    tmp_dir = os.path.join(args.output_dir, 'tmp')
    loop = asyncio.get_event_loop()
    loop.run_until_complete(unzip_files_async(
        annotations_dir, tmp_dir, args.output_dir))
    create_dataset_yaml(args.output_dir)

    shutil.rmtree(os.path.join(args.output_dir, 'tmp'), ignore_errors=True)

    print("Dataset transformation completed.")


if __name__ == '__main__':
    main()

# python dataset_converter.py -id /home/hsnl/ctai-dataset/ctai/fb3b59e7-2aa0-48e0-91d9-880c57523c65 -od /home/hsnl/training-task/${project_name}/$[version_name]/dataset
