import argparse
import csv
import glob
import json
import os
import re
from typing import Union
import time

import log_utils
from wandb.proto import wandb_internal_pb2
from wandb.sdk.internal import datastore

# data_path = '/home/mask/Desktop/test_tflite_maker/wandb/offline-run-20240315_164155-dm503wov/run-dm503wov.wandb'
parser = argparse.ArgumentParser(description="")
parser.add_argument(
    "--project_dir", "-d", type=str, help="log dir", default="/workspace/results"
)
parser.add_argument(
    "--out_dir",
    "-o",
    type=str,
    help="output dir",
    default="/workspace/results/analysis_results",
)
parser.add_argument(
    "--model_type",
    "-t",
    type=str,
    help="model type",
    required=True,
    choices=["yolov5", "tflite"],
)

args = parser.parse_args()

"""
the structure of the train_metrics:
{
    
"""


class LogParser:
    """docstring for LogParser"""

    def __init__(self, args):
        super(LogParser, self).__init__()
        self.args = args
        self.train_metrics = {
            "obj_loss": {"train": [], "val": []},
            "cls_loss": {"train": [], "val": []},
            "box_loss": {"train": [], "val": []},
            "precision": [],
            "recall": [],
            "mAP": [],
        }
        self.system_metrics = []
        self.ETA = None
        self.cur_epoch = None
        self.total_epoch = None
        self.status = None
        self.start_at = None
        self.duration = None
        self.complete_at = None

    def open_log(self):
        self.ds = datastore.DataStore()
        self.ds.open_for_scan(
            glob.glob(
                os.path.join(self.args.project_dir, "wandb", "latest-run", "*.wandb")
            )[0]
        )

    def get_status(self):

        if (
            len(
                glob.glob(
                    os.path.join(
                        self.args.project_dir, "wandb", "latest-run", "*.wandb"
                    )
                )
            )
            == 0
        ):
            self.status = "Queued"
            return self.status

        summary_file_path = os.path.join(
            self.args.project_dir, "wandb", "latest-run", "files", "wandb-summary.json"
        )
        if os.path.exists(summary_file_path):
            with open(summary_file_path, "r") as f:
                data = json.load(f)
                self.duration = data["_wandb"]["runtime"]
                self.status = "Completed"
        else:
            self.status = "Running"

        return self.status

    def parse(self):
        # use for loop instead of while loop to avoid unknown case cause infinite loop
        for i in range(1000000):
            pb = self.parse_one()
            if pb == None:
                return
            # parse depend on each case
            if pb.HasField("run"):
                self.parse_run(pb)
            # parse train log
            elif pb.HasField("output_raw"):
                self.parse_out(pb, args.model_type)
            # parse system log
            elif pb.HasField("stats"):
                self.parse_stats(pb)

    def parse_one(self) -> Union[wandb_internal_pb2.Record, None]:
        # last block(padding) may raise following error:
        # "record checksum is invalid, data may be corrupt"
        # just break
        try:
            data = self.ds.scan_data()
        except AssertionError:
            return None
        if data == None:
            return None
        pb = wandb_internal_pb2.Record()
        pb.ParseFromString(data)
        return pb

    def parse_run(self, pb):
        self.start_at = pb.run.start_time.seconds
        if self.status == "Completed":
            self.complete_at = self.start_at + self.duration

    def parse_out(self, pb, model_type):
        if model_type == "yolov5":
            self.parse_yolov5_out(pb)
        elif model_type == "tflite":
            self.parse_tflite_model_maker_out(pb)
        else:
            ValueError("model_type is not supported")

    def parse_yolov5_out(self, pb):

        # parse the ETA
        ETA_pattern = r"^(\d+)/(\d+)\s.*\s(\d+)%\|.*?(\d+:\d+[\d:]*)<(\d+:\d+[\d:]*)"
        match = re.search(ETA_pattern, pb.output_raw.line.strip())
        if match:
            # epoch in yolo is 0-based
            cur_ep = int(match.group(1))
            total_ep = int(match.group(2))
            progress = int(match.group(3))
            time_ep_pass = log_utils.time_to_seconds(match.group(4))
            time_ep_remain = log_utils.time_to_seconds(match.group(5))
            self.ETA = time_ep_remain + (total_ep - cur_ep) * (
                time_ep_pass + time_ep_remain + 1 # add 1s for bias
            )
            self.cur_epoch = cur_ep + 1
            self.total_epoch = total_ep + 1
            # print(f'epcoh: {cur_ep}, remain time: {time_ep_remain} pass time: {time_ep_pass} progress: {progress} self.ETA: {self.ETA}')

    def parse_tflite_model_maker_out(self, pb):
        epoch_pattern = r"Epoch (\d+)/"
        match = re.search(epoch_pattern, pb.output_raw.line)
        if match:
            self.cur_epoch = match.group(1)
            # print(self.cur_epoch)
            return

        metric_pattern = r"ETA: ((?:[\d]+:)?[\d]{1,2}:[\d]{2}|[\d]+s)|(\w+): ([\d\.]+)"
        matches = re.findall(metric_pattern, pb.output_raw.line)
        print(pb.output_raw.line)
        if matches:
            record = {"timestamp": pb.output_raw.timestamp.seconds}
            for ETA, term, value in matches:
                if ETA:  # If the match is an ETA term
                    # print('ETA:', log_utils.time_to_seconds(ETA), ETA)
                    self.ETA = ETA
                elif term and value:  # For other terms
                    record[term] = value
            # print(record)
            self.train_metrics.append(record)

    def parse_stats(self, pb):
        # TODO: implement it via dataclass
        record = {"timestamp": pb.stats.timestamp.seconds}
        for item in pb.stats.item:
            key = item.key
            value = json.loads(item.value_json)
            # print(type(value), value)
            if "cpu" in key:
                record[key] = value
            elif "network" in key:
                record[key] = value
            elif "memory" in key:
                record[key] = value
            elif "disk" in key:
                record[key] = value
        # print(record)
        self.system_metrics.append(record)

    def to_dict(self):
        # Return a dictionary representation of the class members
        return {
            "status": self.status,
            "start_at": self.start_at,
            "ETA": self.ETA,
            "cur_epoch": self.cur_epoch,
            "total_epoch": self.total_epoch,
            "complete_at": self.complete_at,
            "train_metrics": self.train_metrics,
            "system_metrics": self.system_metrics,
        }

    def to_json(self):
        # Check if the output directory exists, create it if it does not
        if not os.path.exists(self.args.out_dir):
            os.makedirs(self.args.out_dir)
        # Define the path to the output file
        output_file_path = os.path.join(self.args.out_dir, "log.json")
        # Convert the dictionary representation to a JSON string
        result = json.dumps(self.to_dict(), default=str, indent=4)
        # Write result to the output file
        with open(output_file_path, "w") as f:
            f.write(result)

    def post_process(self):
        if args.model_type == "yolov5":
            self.post_process_yolov5()

    def post_process_yolov5(self):
        # If have not parsed the training metrics yet
        csv_path = os.path.join(self.args.project_dir, "exp", "results.csv")
        if os.path.exists(csv_path):
            with open(csv_path, mode="r", newline="", encoding="utf-8") as file:
                reader = csv.DictReader(
                    file, skipinitialspace=True, delimiter=",", quoting=csv.QUOTE_NONE
                )

                for row in reader:
                    # epoch = int(row['epoch'])
                    self.train_metrics["obj_loss"]["train"].append(
                        float(row["train/obj_loss"])
                    )
                    self.train_metrics["obj_loss"]["val"].append(
                        float(row["val/obj_loss"])
                    )
                    self.train_metrics["cls_loss"]["train"].append(
                        float(row["train/cls_loss"])
                    )
                    self.train_metrics["cls_loss"]["val"].append(
                        float(row["val/cls_loss"])
                    )
                    self.train_metrics["box_loss"]["train"].append(
                        float(row["train/box_loss"])
                    )
                    self.train_metrics["box_loss"]["val"].append(
                        float(row["val/box_loss"])
                    )
                    self.train_metrics["precision"].append(
                        float(row["metrics/precision"])
                    )
                    self.train_metrics["recall"].append(float(row["metrics/recall"]))
                    self.train_metrics["mAP"].append(float(row["metrics/mAP_0.5"]))
                    # self.train_metrics.append({
                    #     key: float(value) for key, value in row.items() if key != 'epoch'
                    # })


# TODO: separate the different framework to different parser
def main():
    logParser = LogParser(args)
    status = logParser.get_status()
    if status != "Queued":
        print("parsing log...")
        logParser.open_log()
        logParser.parse()
        logParser.post_process()
    logParser.to_json()

    # print("system_metrics:", logParser.system_metrics)
    # print("train_metrics:", logParser.train_metrics)


if __name__ == "__main__":
    # create timer to measure the log parsing time
    start_time = time.time()
    main()
    end_time = time.time()
    print(f"Time elapsed on parse log: {end_time - start_time}")
    print("parse_log done")
