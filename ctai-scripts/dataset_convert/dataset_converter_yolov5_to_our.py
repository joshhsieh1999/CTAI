import os
import shutil
import argparse
import glob
# 设置参数
parser = argparse.ArgumentParser(description='Convert YOLOv5 dataset to our dataset format.')
parser.add_argument('--base-path', '-d', type=str, default='data', help='Base path of the dataset.')
parser.add_argument('--target-path', '-o', type=str, default='data', help='Target path of the dataset.')

args = parser.parse_args()
base_path = args.base_path
target_path = args.target_path

# count the number of poly annotation
cnt_poly_annotation = 0
cnt_data = 0
# 设置路径

folders_map = {
    'train': 'train',
    'valid': 'val',
    'test': 'test'
}
target_images_dir = os.path.join(target_path, 'images')
target_labels_dir = os.path.join(target_path, 'labels')

# 创建目标文件夹
os.makedirs(target_images_dir, exist_ok=True)
os.makedirs(target_labels_dir, exist_ok=True)

# 函数：移动文件并生成txt文件
def move_files_and_generate_txt(folder_name):
    global cnt_poly_annotation, cnt_data
    image_folder = os.path.join(base_path, folder_name, 'images')
    label_folder = os.path.join(base_path, folder_name, 'labels')
    
    txt_file_path = os.path.join(target_path, f"{folders_map[folder_name]}.txt")
    
    with open(txt_file_path, 'w') as txt_file:

        for filename in os.listdir(label_folder):
            if filename.endswith('.txt'):
                # image file name is the same as label file name, but we need to use glob to find the image file
                image_filenames = glob.glob(os.path.join(image_folder, filename.rsplit('.', 1)[0] + '.*'))
                if len(image_filenames) != 1:
                    raise ValueError(f"Cannot find unique image file for {filename}")
                image_filename = image_filenames[0]

                target_label_path = os.path.join(target_labels_dir, filename)
                target_label_file = open(target_label_path, 'w')
                # read the txt file and check each line is exactly 5 elements
                # if not, ignore whole file, and do not copy image file
                # else, write the line to the buffer
                with open(os.path.join(label_folder, filename), 'r') as f:
                    buffer = []
                    lines = f.readlines()
                    for line in lines:
                        elements = line.split()
                        if len(elements) != 5:
                            cnt_poly_annotation += 1
                            break
                        buffer.append(line)
                    else:
                        cnt_data += 1
                        target_label_file.writelines(buffer)
                        shutil.copy(image_filename, target_images_dir)
                        txt_file.write(f"./images/{os.path.basename(image_filename)}\n")

def create_dataset_yaml():
    shutil.copy(os.path.join(base_path, 'data.yaml'), os.path.join(target_path, 'dataset.yaml'))
    with open(os.path.join(target_path, 'dataset.yaml'), 'r+') as file:
        # remove first 3 lines
        # and add path, train, val, test per line
        lines = file.readlines()
        file.seek(0)
        file.truncate()
        file.write(f"path: ../dataset\n")
        file.write(f"train: train.txt\n")
        file.write(f"val: val.txt\n")
        file.write(f"test: test.txt\n")
        # fine index of line that contains "names:"
        idx = 0
        for i, line in enumerate(lines):
            if "names:" in line:
                idx = i
                break
        # parse and get the list of "names: [class1, class2, ...classN] in one line use eval"
        names = eval(lines[idx].split(":")[1])

        # write the class and index to the file, e.g. "  0: class1"
        file.write(f"\nnames:\n")
        for i, name in enumerate(names):
            file.write(f"  {i}: {name}\n")

# 执行函数
for folder in folders_map.keys():
    move_files_and_generate_txt(folder)
    create_dataset_yaml()

print(f"Total number of poly annotations: {cnt_poly_annotation}")
print(f"Total number of data: {cnt_data}")
print("文件移动和生成txt文件完成。")
