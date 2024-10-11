import glob
import os
import argparse
import yaml
import json
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
parser.add_argument('--output-dir', '-o', type=str, help='output dir',default='/workspace/results/analysis_results')
args = parser.parse_args()

if(os.path.exists(args.output_dir) == False):
    os.makedirs(args.output_dir)

#   const data = {
#     imagesCount: 387,
#     annotationsCount: 100,
#     ratio: {
#       image: { median: { w: 500, h: 333 }, largest: { w: 1500, h: 666 }, smallest: { w: 200, h: 133 } },
#       annotation: { median: { w: 100, h: 100 }, largest: { w: 300, h: 233 }, smallest: { w: 20, h: 30 } }
#     },
#     nullExamples: [{ img: "image_1" }, { img: "image_2" }, { img: "image_3" }],
#     trainSplit: {
#       train: 44, validation: 13, test: 11
#     },
#     classDistribution: {
#       dog: 500, cat: 233, bird: 267
#     },
#   }

data = {}
data['annotationsCount'] = 0
data['ratio'] = {}
data['nullExamples'] = []
data['trainSplit'] = {}
data['classDistribution'] = {}

# tmp lists to store the ratios for statistics
img_ratios = []
annotation_ratios = []
img_files = glob.glob(os.path.join(args.dataset_dir, "images", "*"))

data['imagesCount'] = len(img_files)

# print('img_files:', img_files)

# statistics for the train split
with open(os.path.join(args.dataset_dir, 'train.txt'), 'r') as f:
    data['trainSplit']['train'] = len(f.readlines())
with open(os.path.join(args.dataset_dir, 'val.txt'), 'r') as f:
    data['trainSplit']['validation'] = len(f.readlines())
with open(os.path.join(args.dataset_dir, 'test.txt'), 'r') as f:
    data['trainSplit']['test'] = len(f.readlines())

with open(os.path.join(args.dataset_dir, 'dataset.yaml'),  'r') as f:
    valuesYaml = yaml.load(f, Loader=yaml.FullLoader)
    class_mapping = valuesYaml['names']
    print(class_mapping)
    
for img_file in img_files:
    label_file = os.path.join(args.dataset_dir, 'labels', os.path.basename(os.path.splitext(img_file)[0] + '.txt'))
    img_width, img_height = imagesize.get(img_file)
    img_ratios.append({'w': img_width, 'h': img_height, 'img': img_file})
    with open(label_file, 'r') as f:
        lines = f.readlines()
        if len(lines) == 0:
            data['nullExamples'].append(label_file)
        else:
            data['annotationsCount'] += len(lines)
            for line in lines:
                # line = "class_id x_center y_center width height"
                class_name = class_mapping[int(line.split()[0])]
                if class_name not in data['classDistribution']:
                    data['classDistribution'][class_name] = 1
                else:
                    data['classDistribution'][class_name] += 1
                
                left, top, right, bottom = convert_yolo_coordinates_to_voc(*line.split()[1:], img_width, img_height)
                annotation_ratios.append({'w': right - left, 'h': bottom - top, 'bbox': f'{class_name} {left} {top} {right} {bottom}', 'img': img_file})

sorted_img_ratios = sorted(img_ratios, key=lambda x: x['w'] * x['h'])
sorted_annotation_ratios = sorted(annotation_ratios, key=lambda x: x['w'] * x['h'])

data['ratio']['image'] = { 'median': sorted_img_ratios[len(sorted_img_ratios) // 2], 'largest': sorted_img_ratios[-1], 'smallest': sorted_img_ratios[0] }
data['ratio']['annotation'] = { 'median': sorted_annotation_ratios[len(sorted_annotation_ratios) // 2], 'largest': sorted_annotation_ratios[-1], 'smallest': sorted_annotation_ratios[0] }

# store the data in a json file to output_dir
with open(os.path.join(args.output_dir, 'dataset_check.json'), 'w') as f:
    json.dump(data, f)

print("dataset check generated successfully!")

# python dataset_check.py --dataset-dir /home/hsnl/crazyfire/docker-testing/datasets/project-1/version-4/dataset --output-dir /home/hsnl/crazyfire/docker-testing/results/project-1/version-4/analysis_results