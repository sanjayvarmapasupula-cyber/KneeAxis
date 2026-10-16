# Offline Wheelhouse Directory

This folder is used to store pre-downloaded `.whl` files for completely offline Python environment installation on the college GPU server.

### To populate this on your internet-connected laptop (for target Linux server):
```bash
# If your laptop is Linux matching the server:
pip download -r requirements-college.txt -d wheelhouse/

# Or downloading specifically for Linux x86_64 and your server's Python version (e.g. cp310):
pip download --only-binary=:all: --platform manylinux2014_x86_64 --python-version 3.10 --implementation cp --abi cp310 -r requirements-college.txt -d wheelhouse/
```

### To install offline on the college JupyterHub server:
```bash
python -m pip install --no-index --find-links=wheelhouse -r requirements-college.txt
```
