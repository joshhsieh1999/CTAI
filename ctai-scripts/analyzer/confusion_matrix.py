# ref: https://github.com/kaanakan/object_detection_confusion_matrix
import os
import numpy as np
import argparse
import yaml
import json


def box_iou_calc(boxes1, boxes2):
    def box_area(box):
        return (box[2] - box[0]) * (box[3] - box[1])

    area1 = box_area(boxes1.T)
    area2 = box_area(boxes2.T)

    lt = np.maximum(boxes1[:, None, :2], boxes2[:, :2])  # [N,M,2]
    rb = np.minimum(boxes1[:, None, 2:], boxes2[:, 2:])  # [N,M,2]

    inter = np.prod(np.clip(rb - lt, a_min=0, a_max=None), 2)
    return inter / (area1[:, None] + area2 - inter)


class ConfusionMatrix:
    def __init__(self, num_classes: int, CONF_THRESHOLD, IOU_THRESHOLD):
        self.matrix = [[[] for _ in range(num_classes + 1)]
                       for _ in range(num_classes + 1)]
        self.num_classes = num_classes
        self.CONF_THRESHOLD = CONF_THRESHOLD
        self.IOU_THRESHOLD = IOU_THRESHOLD

    def process_batch(self, detections, labels: np.ndarray, image_path: str):

        try:
            gt_classes = labels[:, 0].astype(np.int16)
        except (IndexError, TypeError):
            # labels are empty, end of process, add all to FN
            if (len(detections) == 0):
                return
            detections = detections[detections[:, 4] > self.CONF_THRESHOLD]
            for i, detection in enumerate(detections):
                detection_class = detections[i][5].astype(np.int16)
                self.matrix[detection_class][self.num_classes].append(
                    {"gtIdx": None, "pdIdx": i, "img": image_path, "gtBbox": None, "pdBbox": detections[i][:5].tolist()})  # FP
            return

        try:
            detections = detections[detections[:, 4] >= self.CONF_THRESHOLD]
        except (IndexError, TypeError):
            # detections are empty, end of process
            for i, label in enumerate(labels):
                gt_class = gt_classes[i]
                self.matrix[self.num_classes][gt_class].append(
                    # FN: add with None for det_bbox_idx
                    {"gtIdx": i,  "pdIdx": None,  "img": image_path, "gtBbox": labels[i][1:].tolist(), "pdBbox": None})
            return

        detection_classes = detections[:, 5].astype(np.int16)
        all_ious = box_iou_calc(labels[:, 1:], detections[:, :4])
        want_idx = np.where(all_ious > self.IOU_THRESHOLD)
        all_matches = [[want_idx[0][i], want_idx[1][i], all_ious[want_idx[0]
                                                                 [i], want_idx[1][i]]] for i in range(want_idx[0].shape[0])]
        all_matches = np.array(all_matches)
        if all_matches.shape[0] > 0:
            all_matches = all_matches[all_matches[:, 2].argsort()[::-1]]
            all_matches = all_matches[np.unique(
                all_matches[:, 1], return_index=True)[1]]
            all_matches = all_matches[all_matches[:, 2].argsort()[::-1]]
            all_matches = all_matches[np.unique(
                all_matches[:, 0], return_index=True)[1]]

        for i, label in enumerate(labels):
            gt_class = gt_classes[i]
            if all_matches.shape[0] > 0 and all_matches[all_matches[:, 0] == i].shape[0] == 1:
                detection_index = int(
                    all_matches[all_matches[:, 0] == i, 1][0])
                detection_class = detection_classes[detection_index]
                self.matrix[detection_class][gt_class].append({"gtIdx": int(gt_class), "pdIdx": int(
                    detection_class), "img": image_path, "gtBbox": labels[i][1:].tolist(), "pdBbox": detections[detection_index][:5].tolist()})  # TP
            else:
                self.matrix[self.num_classes][gt_class].append({"gtIdx": int(
                    gt_class), "pdIdx": None, "img": image_path, "gtBbox": labels[i][1:].tolist(), "pbBbox": None})  # FN

        for i, detection in enumerate(detections):
            if not all_matches.shape[0] or (all_matches.shape[0] and all_matches[all_matches[:, 1] == i].shape[0] == 0):
                detection_class = detection_classes[i]
                self.matrix[detection_class][self.num_classes].append(
                    {"gtIdx": None, "pdIdx": int(detection_class), "img": image_path,
                     "gtBbox": None, "pdBbox": detections[i][:5].tolist()})

    def return_matrix(self):
        return self.matrix

    def print_matrix(self):
        for i in range(self.num_classes + 1):
            for j in range(self.num_classes + 1):
                print(f"{len(self.matrix[i][j])}",
                      end='\n' if j == self.num_classes else ' ')

# Example of using the updated ConfusionMatrix class
# det = np.array([[349, 832, 470, 907, 0.9968715906143188, 0], [469, 789, 676, 886, 0.9854957461357117, 0], [759, 887, 907, 1065, 0.9964740872383118, 4], [1234, 736, 1341, 757, 0.7642012238502502, 11], [1683, 513, 1759, 556, 0.8026162385940552, 13], [1883, 438, 1919, 503, 0.7332593202590942, 13], [478, 293, 514, 338, 0.70100337266922, 13]])
# gt = np.array([[0, 575, 789, 677, 889], [0, 469, 806, 581, 860], [0, 349, 829, 472, 907], [1, 474, 289, 512, 342], [1, 1681, 511, 1755, 563], [1, 1873, 439, 1920, 506]])

# Example of using the updated ConfusionMatrix class
# det = np.array([[349, 832, 470, 907, 0.9968715906143188, 0], [469, 789, 676, 886, 0.9854957461357117, 0], [759, 887, 907, 1065, 0.9964740872383118, 4], [1234, 736, 1341, 757, 0.7642012238502502, 11], [1683, 513, 1759, 556, 0.8026162385940552, 13], [1883, 438, 1919, 503, 0.7332593202590942, 13], [478, 293, 514, 338, 0.70100337266922, 13]])
# gt = np.array([[0, 575, 789, 677, 889], [0, 469, 806, 581, 860], [0, 349, 829, 472, 907], [1, 474, 289, 512, 342], [1, 1681, 511, 1755, 563], [1, 1873, 439, 1920, 506]])

# detections = {
#     # "image_1": np.array([
#     #     [349, 832, 470, 907, 0.9968715906143188, 0],
#     #     [469, 789, 676, 886, 0.9854957461357117, 0],
#     #     [1234, 736, 1341, 757, 0.7642012238502502, 11],
#     #     [759, 887, 907, 1065, 0.9964740872383118, 4],
#     # ]),
#     # "image_2": np.array([
#     #     [1683, 513, 1759, 556, 0.8026162385940552, 13],
#     #     [1883, 438, 1919, 503, 0.7332593202590942, 13],
#     #     [478, 293, 514, 338, 0.70100337266922, 13]
#     # ])
#     "image_1": det
# }

# ground_truths = {
#     # "image_1": np.array([[0, 575, 789, 677, 889], [0, 469, 806, 581, 860], [0, 349, 829, 472, 907], [1, 474, 289, 512, 342]]),
#     # "image_2": np.array([[13, 1681, 511, 1755, 563], [13, 1873, 439, 1920, 506]])
#     "image_1": gt
# }

# Function to read and parse .txt file content


def parse_txt_file(file_path, reversed_class_mapping, is_pred=False):
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            lines = file.readlines()
            data = []
            for line in lines:
                parts = line.strip().split()
                if is_pred:
                    # Reorder parts from yolo `class_id x1 y1 x2 y2 conf` to `x1 y1 x2 y2 conf class_id`
                    reordered_parts = [int(parts[1]), int(parts[2]), int(parts[3]), int(
                        parts[4]), float(parts[5]), int(reversed_class_mapping[parts[0]])]
                else:
                    # Reorder parts to `class_id x1 y1 x2 y2`
                    reordered_parts = [int(reversed_class_mapping[parts[0]]), int(
                        parts[1]), int(parts[2]), int(parts[3]), int(parts[4])]
                data.append(reordered_parts)

            return np.array(data)
    except FileNotFoundError:
        print(f"File not found: {file_path}")
        return np.array([])

# Function to process the input directory and read files


def process_directory(dataset_dir, pred_dir, gt_dir):
    gt = {}
    det = {}
    class_mapping = {}
    reversed_class_mapping = {}
    test_file = os.path.join(dataset_dir, 'test.txt')

    if not os.path.isfile(test_file):
        ValueError(f"{test_file} not found.")

    with open(os.path.join(args.dataset_dir, 'dataset.yaml'),  'r') as f:
        valuesYaml = yaml.load(f, Loader=yaml.FullLoader)
        class_mapping = valuesYaml['names']
        reversed_class_mapping = {v: k for k, v in class_mapping.items()}

    with open(test_file, 'r', encoding='utf-8') as file:
        for line in file:
            image_path = line.strip()
            if not image_path:
                continue
            image_name, image_ext = os.path.splitext(
                os.path.basename(image_path))
            gt_txt_path = os.path.join(gt_dir, f"{image_name}.txt")
            pred_txt_path = os.path.join(pred_dir, f"{image_name}.txt")
            gt[f'{image_name}{image_ext}'] = parse_txt_file(
                gt_txt_path, reversed_class_mapping, is_pred=False)
            det[f'{image_name}{image_ext}'] = parse_txt_file(
                pred_txt_path, reversed_class_mapping, is_pred=True)
    return gt, det, class_mapping


'''
        Confusion Matrix
                     ^
     |     ._________|
     |     |         |
   (pred)  |         | (truth null, FP, vertical line)
     |     |         |
     |   <-------------> (pred null, FN, horizontal line)
     |      trurh    v
'''

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Process image annotations.')
    parser.add_argument('--dataset-dir', type=str, default='/workspace/dataset',
                        help='path to the dataset directory that contains the test.txt file and the yaml file')
    parser.add_argument('--label-dir', type=str, default='/workspace/results/voc_format_labels',
                        help='Directory containing label files')
    parser.add_argument('--pred-dir-name', type=str,
                        default='pred', help='predictions directory name')
    parser.add_argument('--gt-dir-name', type=str,
                        default='truth', help='ground truth directory name')
    parser.add_argument('--output-dir', type=str,
                        default='/workspace/results/analysis_results', help='output directory')
    parser.add_argument('--IOU_THRESHOLD', type=float,
                        default=0.6, help='IoU threshold')

    group = parser.add_mutually_exclusive_group()
    group.add_argument('--conf-threshold-file', type=str, help='file containing confidence threshold', default='/workspace/results/test/results.json')
    group.add_argument('--CONF_THRESHOLD', type=float, help='confidence threshold')

    args = parser.parse_args()
    if (not os.path.exists(args.output_dir)):
        os.makedirs(args.output_dir)

    # try read confidence threshold from results.json file, if failed, use value from args
    try:
        with open(args.conf_threshold_file, 'r') as f:
            results = json.load(f)
            args.CONF_THRESHOLD = float(results["all"]['conf_threshold'])
            f.close()
    except:
        print('Failed to read confidence threshold from results.json file, using default value')
        args.CONF_THRESHOLD = 0.3
        pass

    pred_label_path = os.path.join(args.label_dir, args.pred_dir_name)
    gt_label_path = os.path.join(args.label_dir, args.gt_dir_name)
    # Process the test directory and print the results
    ground_truths, detections, class_mapping = process_directory(
        args.dataset_dir, pred_label_path, gt_label_path)
    # print(ground_truths)
    # print(detections)

    CM = ConfusionMatrix(num_classes=len(
        class_mapping), CONF_THRESHOLD=args.CONF_THRESHOLD, IOU_THRESHOLD=args.IOU_THRESHOLD)
    for image_path in detections:
        CM.process_batch(detections[image_path],
                         ground_truths[image_path], image_path)

    cm = CM.return_matrix()
    CM.print_matrix()
    print(class_mapping)
    # print(cm)
    with open(os.path.join(args.output_dir, 'confusion_matrix.json'), 'w') as f:
        json.dump({'confusion_matrix': cm, 'class_mapping': class_mapping}, f)
        f.close()

# each cell in confusion matrix will be: [gt_class, pred_class, image_path, gt_bbox, pred_bbox]
# , where gt_class and pred_class are the class ids, image_path is the path to the image, gt_bbox are the format [x1, y1, x2, y2] and pred_bbox are the format [x1, y1, x2, y2, confidence]
# python confusion_matrix.py --dataset-dir /home/hsnl/crazyfire/docker-testing/datasets/project-1/version-4/dataset --label-dir /home/hsnl/crazyfire/docker-testing/results/project_1/version_4/mAP/input --output-dir /home/hsnl/crazyfire/docker-testing/results/project-1/version-4/analysis_results

# in container:
# python confusion_matrix.py
