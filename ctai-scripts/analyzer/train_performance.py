import json
import argparse
import os
import csv


class TrainStatusParser:
    def __init__(self, args):
        self.args = args
        self.train_status = {
            "obj_loss": {
                "train": [],
                "val": []
            },
            "cls_loss": {
                "train": [],
                "val": []
            },
            "box_loss": {
                "train": [],
                "val": []
            },
            "precision": [],
            "recall": [],
            "mAP": []
        }
        self.indicator = {
            "mAP": 0.0,
            "precision": 0.0,
            "recall": 0.0,
            "f1": 0.0
        }

    def parse_status(self, status) -> list:
        raise NotImplementedError(
            "parse_status method must be implemented in derived classes.")

    def parse_indicator(self, indicator) -> list:
        raise NotImplementedError(
            "parse_indicator method must be implemented in derived classes.")


class YOLOv5_TrainStatusParser(TrainStatusParser):
    def parse_status(self, status) -> list:
        csv_path = os.path.join(self.args.result_dir, f'exp', "results.csv")
        if os.path.exists(csv_path):
            with open(csv_path, mode='r', newline='', encoding='utf-8') as file:
                reader = csv.DictReader(
                    file, skipinitialspace=True, delimiter=',', quoting=csv.QUOTE_NONE)

                for row in reader:
                    self.train_status["obj_loss"]["train"].append(float(row["train/obj_loss"]))
                    self.train_status["obj_loss"]["val"].append(float(row["val/obj_loss"]))
                    self.train_status["cls_loss"]["train"].append(float(row["train/cls_loss"]))
                    self.train_status["cls_loss"]["val"].append(float(row["val/cls_loss"]))
                    self.train_status["box_loss"]["train"].append(float(row["train/box_loss"]))
                    self.train_status["box_loss"]["val"].append(float(row["val/box_loss"]))
                    self.train_status["precision"].append(float(row["metrics/precision"]))
                    self.train_status["recall"].append(float(row["metrics/recall"]))
                    self.train_status["mAP"].append(float(row["metrics/mAP_0.5"]))
            return self.train_status

        else:
            raise FileNotFoundError("results.csv not found in the result directory")

    def parse_indicator(self, indicator) -> list:
        # We can just use the last value of the training status
        self.indicator["mAP"] = self.train_status["mAP"][-1]
        self.indicator["precision"] = self.train_status["precision"][-1]
        self.indicator["recall"] = self.train_status["recall"][-1]
        self.indicator["f1"] = 2 * (self.indicator["precision"] * self.indicator["recall"]) / \
            (self.indicator["precision"] + self.indicator["recall"])
        return self.indicator


if __name__ == "__main__":

    TRAINING_STATUS_PARSERS = { "yolov5": YOLOv5_TrainStatusParser }

    parser = argparse.ArgumentParser(description='')
    parser.add_argument('--result-dir', '-d', type=str,
                        help='log dir', default='/workspace/results')
    parser.add_argument('--out_dir', '-o', type=str, help='output dir',
                        default='/workspace/results/analysis_results')
    parser.add_argument('--model_type', '-t', type=str,
                        help='model type', required=True, choices=TRAINING_STATUS_PARSERS.keys())
    args = parser.parse_args()

    if (os.path.exists(args.out_dir) == False):
        os.makedirs(args.out_dir)
    
    parser = TRAINING_STATUS_PARSERS[args.model_type](args)
    status = parser.parse_status(args.result_dir)
    indicator = parser.parse_indicator(args.result_dir)

    with open(os.path.join(args.out_dir, 'training_status.json'), 'w') as f:
        json.dump({"status": status, "indicator": indicator}, f)


