"""
PythonAnywhere WSGI template for bead-gift-workshop.

Usage:
1. Clone the repo to /home/<your-username>/bead-gift-workshop
2. Create a PythonAnywhere web app with Manual configuration
3. Open the generated WSGI file from the Web tab
4. Replace its contents with this file, then update PROJECT_HOME
"""

import sys
from pathlib import Path

PROJECT_HOME = Path("/home/YOUR_USERNAME/bead-gift-workshop")

if str(PROJECT_HOME) not in sys.path:
    sys.path.insert(0, str(PROJECT_HOME))

from backend.app import app as application

