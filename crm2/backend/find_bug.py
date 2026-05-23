import os

def search_files(directory, query):
    for root, dirs, files in os.walk(directory):
        if 'venv' in dirs: dirs.remove('venv')
        if 'node_modules' in dirs: dirs.remove('node_modules')
        for file in files:
            if file.endswith('.py'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        for line_no, line in enumerate(f, 1):
                            if query in line:
                                print(f"{path}:{line_no}: {line.strip()}")
                except Exception:
                    pass

search_files('backend', '_log_activity')
