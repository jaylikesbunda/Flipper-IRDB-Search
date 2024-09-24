
import sys
import subprocess

def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

try:
    import requests
except ImportError:
    install('requests')
    import requests
import os
import json
import zipfile
import requests
from pathlib import Path
from urllib.parse import quote
from collections import Counter



# Get the directory where the script is located
SCRIPT_DIR = Path(__file__).parent.absolute()
# GitHub raw content base URL
GITHUB_RAW_BASE = "https://raw.githubusercontent.com/logickworkshop/Flipper-IRDB/main/"

def download_repo():
    url = "https://github.com/logickworkshop/Flipper-IRDB/archive/refs/heads/main.zip"
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

def analyze_database(database):
    device_types = Counter(entry['device_type'] for entry in database)
    brands = Counter(entry['brand'] for entry in database)
    models = Counter(entry['model'] for entry in database)
    protocols = Counter(entry.get('protocol', 'Unknown') for entry in database)

    return {
        'total_entries': len(database),
        'device_types': device_types,
        'brands': brands,
        'models': models,
        'protocols': protocols
    }

def print_statistics(stats):
    print(f"\nTotal entries: {stats['total_entries']}")

    print("\nTop 10 Device Types:")
    for device_type, count in stats['device_types'].most_common(10):
        print(f"  {device_type}: {count}")

    print("\nTop 10 Brands:")
    for brand, count in stats['brands'].most_common(10):
        print(f"  {brand}: {count}")

    print("\nTop 10 Models:")
    for model, count in stats['models'].most_common(10):
        print(f"  {model}: {count}")

    print("\nTop 10 Protocols:")
    for protocol, count in stats['protocols'].most_common(10):
        print(f"  {protocol}: {count}")

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

    print("\nAnalyzing database...")
    stats = analyze_database(database)
    print_statistics(stats)

if __name__ == "__main__":
    main()