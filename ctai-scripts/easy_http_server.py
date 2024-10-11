import subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Dict, List
from urllib.parse import parse_qs, urlparse


class TrainingHTTPRequestHandler(BaseHTTPRequestHandler):
    # List of required parameters for the training script
    REQUIRED_PARAMS: List[str] = [
        "datasetPath",
        "projectId",
        "versionId",
        "train",
        "val",
        "test",
        "epochs",
        "batchSize",
        "learningRate",
        "modelName",
    ]

    def do_GET(self) -> None:
        """Handle GET requests."""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query_components = parse_qs(parsed_path.query)

        if path == "/train":
            self.handle_train_request(query_components)
        else:
            self.send_error(404, "Not Found")

    def handle_train_request(self, params: Dict[str, List[str]]) -> None:
        """Handle the training request by running the bash script."""
        missing_params = [
            param for param in self.REQUIRED_PARAMS if param not in params
        ]

        if missing_params:
            self.send_error(400, f"Missing parameters: {', '.join(missing_params)}")
            return

        args = [params[param][0] for param in self.REQUIRED_PARAMS]
        self.run_script(args)

    def run_script(self, args: List[str]) -> None:
        """Execute the bash script with the provided arguments."""
        command = ["bash", "./train_task.sh"] + args
        print(f"Executing command: {' '.join(command)}")

        try:
            subprocess.run(command, check=True)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"Script executed successfully!")
        except subprocess.CalledProcessError as e:
            self.send_error(500, f"Failed to execute script: {str(e)}")


def run_server(port: int = 8087) -> None:
    """Run the HTTP server."""
    server_address = ("0.0.0.0", port)
    httpd = HTTPServer(server_address, TrainingHTTPRequestHandler)
    print(f"Server running on port {port}...")
    httpd.serve_forever()


if __name__ == "__main__":
    run_server()
