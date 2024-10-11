import os
import argparse
import yaml
import imagesize

def convert_yolo_coordinates_to_voc(x_c_n, y_c_n, width_n, height_n, img_width, img_height):
    ## remove normalization given the size of the image
    x_c = float(x_c_n) * img_width
    y_c = float(y_c_n) * img_height
    width = float(width_n) * img_width
    height = float(height_n) * img_height
    ## compute half width and half height
    half_width = width / 2
    half_height = height / 2
    ## compute left, top, right, bottom
    ## in the official VOC challenge the top-left pixel in the image has coordinates (1;1)
    left = int(x_c - half_width) + 1
    top = int(y_c - half_height) + 1
    right = int(x_c + half_width) + 1
    bottom = int(y_c + half_height) + 1
    return left, top, right, bottom

parser = argparse.ArgumentParser(description='')
parser.add_argument('--dataset-dir', '-d' ,type=str, help='dataset dir', default='/workspace/dataset')
group = parser.add_mutually_exclusive_group(required=True)
group.add_argument('--truth', '-gt' ,action='store_true')
group.add_argument('--predict', '-pred', action='store_true')
parser.add_argument('--pred-dir', '-p', type=str, help='prediction dir')
parser.add_argument('--output_dir', '-o', type=str, help='output dir',default='/workspace/results/voc_format_labels')
args = parser.parse_args()

if(os.path.exists(args.output_dir) == False):
    os.makedirs(args.output_dir)

if(args.truth and os.path.exists(os.path.join(args.output_dir, 'truth')) == False):
    os.makedirs(os.path.join(args.output_dir, 'truth'))
    
if(args.predict and  os.path.exists(os.path.join(args.output_dir, 'pred')) == False):
    os.makedirs(os.path.join(args.output_dir, 'pred'))
    
if(args.predict and args.pred_dir == None):
    args.pred_dir = '/workspace/results/test'
# if(args.dataset_dir == None):
#     args.dataset_dir = '/workspace/dataset/dataset/' if args.truth else os.path.join(args.output_dir, 'predictions')
# make sure that the cwd() in the beginning is the location of the python script (so that every path makes sense)

with open(os.path.join(args.dataset_dir, 'dataset.yaml'),  'r') as f:
    valuesYaml = yaml.load(f, Loader=yaml.FullLoader)
    class_mapping = valuesYaml['names']
    print(class_mapping)

with open(os.path.join(args.dataset_dir, 'test.txt') , "r") as f:
    txt_filename = f.readlines()
    # parse the file names and extensions
    file_infos = [file.strip().removeprefix('./images/').rsplit('.', 1) for file in txt_filename]

# 逐个读取 test.txt 中列出的文件
for file_stem, file_ext in file_infos:
    if(args.truth):
        txt_file_path = os.path.join(args.dataset_dir, 'labels', file_stem + '.txt')
    else:
        txt_file_path = os.path.join(args.pred_dir, 'labels', file_stem + '.txt')
    # 检查文件是否存在
    if not os.path.exists(txt_file_path):
        if args.truth:
            raise ValueError(f"File {txt_file_path} not found.")
        else:
            # if yolo val.py doesn't predict any object, that file will not exist
            # we create an empty file for it
            ValueError(f"File {txt_file_path} not found.")
            open(os.path.join(args.output_dir, 'pred' , file_stem + '.txt'), 'a').close()
            continue
    
    # 读取文件内容
    with open(txt_file_path, "r") as f:
        labels = f.readlines()
        # print(f"Content of {txt_file_path}:")
        if(len(labels) == 0):
            # print("Empty")
            open(os.path.join(args.output_dir, 'pred' if args.predict else 'truth' , file_stem + '.txt'), 'a').close()
        else:
            # print(labels)
            img_file_path = os.path.join(args.dataset_dir, 'images', file_stem + '.' + file_ext)
            img_width, img_height = imagesize.get(img_file_path)
            converted_labels = ""
            for label in labels:
                ## "c" stands for center and "n" stands for normalized
                if(args.truth):
                    obj_id, x_c_n, y_c_n, width_n, height_n = label.split()
                else:
                    obj_id, x_c_n, y_c_n, width_n, height_n, score = label.split()
                obj_name = class_mapping[int(obj_id)]
                left, top, right, bottom = convert_yolo_coordinates_to_voc(x_c_n, y_c_n, width_n, height_n, img_width, img_height)
                
                if(args.truth):
                    converted_labels += obj_name + " " + str(left) + " " + str(top) + " " + str(right) + " " + str(bottom) + '\n'
                else:
                    converted_labels += obj_name + " " + str(left) + " " + str(top) + " " + str(right) + " " + str(bottom) + " " + score + '\n'

            with open(os.path.join(args.output_dir, 'pred' if args.predict else 'truth' , file_stem + '.txt'), "w") as f:
                f.write(converted_labels)
                
print("Conversion completed!")

# python yolo_to_voc.py -d /home/hsnl/crazyfire/docker-testing/datasets/project-1/version-4/dataset -gt -o /home/hsnl/crazyfire/docker-testing/results/project-1/version-4/voc_format_labels
# python yolo_to_voc.py -d /home/hsnl/crazyfire/docker-testing/datasets/project-1/version-4/dataset -pred -o /home/hsnl/crazyfire/docker-testing/results/project-1/version-4/voc_format_labels -p /home/hsnl/crazyfire/docker-testing/results/project-1/version-4/test

# in container
# python yolo_to_voc.py -gt
# python yolo_to_voc.py -pred