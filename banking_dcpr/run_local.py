#!/usr/bin/env python3
"""
run_local.py
Launcher for local packaged Django backend.
Finds a free localhost port, prints it to stdout as JOPCA_BACKEND_PORT=<port>,
and starts Django's runserver on that port.
"""

import os
import socket
import sys
from django.core.management import execute_from_command_line

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'banking_dcpr.settings')

def find_free_port():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('127.0.0.1', 0))
    addr, port = s.getsockname()
    s.close()
    return port

if __name__ == '__main__':
    # Allow overriding port via env var (useful for debugging)
    port = os.environ.get('JOPCA_PORT')
    if not port:
        port = str(find_free_port())

    # Print the chosen port in a single line for Electron to parse
    print(f"JOPCA_BACKEND_PORT={port}", flush=True)

    # Run Django development server bound to 127.0.0.1:<port>
    # Using runserver is fine for a single-machine offline app.
    argv = ['manage.py', 'runserver', f'127.0.0.1:{port}']
    execute_from_command_line(argv)