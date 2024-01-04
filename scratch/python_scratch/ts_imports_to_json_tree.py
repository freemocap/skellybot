
import os
import re
from collections import defaultdict
import toml
import json

# Function to parse imports
def parse_imports(file_content):
    # ... regex to extract desired imports ...

# Recursive walk
def walk_and_parse(directory):
    imports_graph = defaultdict(list)
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.ts'):
                # ... read file and parse imports ...
                # ... update imports_graph ...

# Save to TOML and JSON
def save_to_files(imports_graph):
    # ... use toml and json libraries to save ...

# Putting it all together
def main(directory):
    imports_graph = walk_and_parse(directory)
    save_to_files(imports_graph)

# Run the script
if __name__ == "__main__":
    main("path_to_ts_files")