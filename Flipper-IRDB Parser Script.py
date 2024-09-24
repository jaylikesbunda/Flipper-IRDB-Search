import os
import json
import zipfile
import requests
from pathlib import Path
from urllib.parse import quote

# Get the directory where the script is located
SCRIPT_DIR = Path(__file__).parent.absolute()

# GitHub raw content base URL
GITHUB_RAW_BASE = "https://raw.githubusercontent.com/Lucaslhm/Flipper-IRDB/main/"

def download_repo():
    url = "https://github.com/Lucaslhm/Flipper-IRDB/archive/refs/heads/main.zip"
    zip_path = SCRIPT_DIR / "Flipper-IRDB.zip"
    extract_path = SCRIPT_DIR / "Flipper-IRDB-main"

    print(f"Downloading repository to {zip_path}...")
    response = requests.get(url)
    with open(zip_path, "wb") as f:
        f.write(response.content)
    
    print(f"Extracting to {extract_path}...")
    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall(SCRIPT_DIR)
    
    os.remove(zip_path)
    return extract_path

def parse_ir_file(file_path):
    encodings = ['utf-8', 'latin-1', 'ascii', 'utf-16']
    for encoding in encodings:
        try:
            with open(file_path, "r", encoding=encoding) as f:
                content = f.read()
            break
        except UnicodeDecodeError:
            continue
    else:
        print(f"Warning: Unable to decode file {file_path}. Skipping.")
        return {}

    metadata = {}
    additional_info = []
    for line in content.split("\n"):
        if line.startswith("# "):
            key, _, value = line[2:].partition(": ")
            key = key.lower().strip()
            value = value.strip()
            if key and value:
                metadata[key] = value
            elif key:
                additional_info.append(key)
    
    if additional_info:
        metadata["additional_info"] = ", ".join(additional_info)
    
    return metadata

def extract_brand_model(filename):
    # Remove the .ir extension
    name = filename[:-3] if filename.endswith('.ir') else filename
    
    # Split by underscore
    parts = name.split('_')
    
    if len(parts) >= 2:
        brand = parts[0]
        model = '_'.join(parts[1:])  # Join all parts after the first underscore
    else:
        brand = name
        model = ""
    
    return brand, model

def create_database(repo_dir):
    database = []
    for root, _, files in os.walk(repo_dir):
        for file in files:
            if file.endswith(".ir"):
                file_path = Path(root) / file
                relative_path = file_path.relative_to(repo_dir)
                
                parts = relative_path.parts
                device_type = parts[0] if len(parts) > 0 else ""
                brand, model = extract_brand_model(file)
                series = parts[2] if len(parts) > 2 else ""
                
                metadata = parse_ir_file(file_path)
                
                if metadata:  # Only add to database if we successfully parsed the file
                    entry = {
                        "filename": file,
                        "device_type": device_type,
                        "brand": brand,
                        "model": model,
                        "series": series,
                        "path": str(relative_path),
                        **metadata
                    }
                    database.append(entry)
    
    return database

def main():
    print("Downloading and extracting Flipper-IRDB repository...")
    repo_dir = download_repo()
    
    print("Parsing IR files and creating database...")
    database = create_database(repo_dir)
    
    database_path = SCRIPT_DIR / "flipper_irdb_database.json"
    print(f"Saving database to {database_path}...")
    with open(database_path, "w", encoding="utf-8") as f:
        json.dump(database, f, indent=2, ensure_ascii=False)
    
    print(f"Database created with {len(database)} entries.")
    print(f"Database saved as '{database_path}'")

if __name__ == "__main__":
    main()