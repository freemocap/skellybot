
import os
import re
from collections import defaultdict
import toml
import json

def extract_info_from_ts(file_path: str) -> dict:
    with open(file_path, 'r') as file:
        content = file.read()

    # Regular expressions to find class names, decorators, imports, and providers
    class_name_pattern = r'export class ([\w]+)'
    decorator_pattern = r'@[\w]+\([\w\W]+?\)'
    import_pattern = r'import\s+{([^}]+)}\s+from\s+["\']([^"\']+)["\'];'
    provider_pattern = r'providers: \[([^\]]+)\]'

    class_names = re.findall(class_name_pattern, content)
    decorators = re.findall(decorator_pattern, content)
    import_statements = re.findall(import_pattern, content)
    imports = [{'imports': m[0].split(', '), 'from': m[1]} for m in import_statements]
    providers = re.findall(provider_pattern, content)

    return {
        'class_names': class_names,
        'decorators': decorators,
        'imports': imports,
        'providers': providers
    }

def save_to_toml(data: dict, toml_file_path: str):
    toml_data = toml.dumps(data)
    with open(toml_file_path, 'w') as toml_file:
        toml_file.write(toml_data)

def save_to_json(data: dict, json_file_path: str):
    with open(json_file_path, 'w', encoding="utf-8") as json_file:
        json.dump(data, json_file, indent=4)

def process_ts_files(directory_path: str, output_folder: str):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    for root, dirs, files in os.walk(directory_path):
        for file in files:
            if file.endswith(".ts"):
                ts_file_path = os.path.join(root, file)
                info = extract_info_from_ts(ts_file_path)

                # Generate the output file paths
                base_name = os.path.splitext(file)[0]
                toml_file_path = os.path.join(output_folder, base_name + '.toml')
                json_file_path = os.path.join(output_folder, base_name + '.json')

                save_to_toml(info, toml_file_path)
                save_to_json(info, json_file_path)

# Usage
directory_path = input("Enter the directory path: ")
output_folder = input("Enter the output folder: ")
process_ts_files(directory_path,
