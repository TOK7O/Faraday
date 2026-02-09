#!/bin/bash
mkdir -p ssl
openssl req -new -x509 -days 36500 -nodes -text -out ssl/server.crt -keyout ssl/server.key -subj "/CN=faraday-db"
# Caution - this was only tested on Windows, so cert generating on Linux/Mac may not work as intended!
chmod 600 ssl/server.key
echo "Certs were generated in the ssl folder!"

# If you don't have openssl installed, my recommended way is:
# 1. Install chocolatey: https://chocolatey.org/install
# 2. Install openssl by running this comand in admin mode:
# (run this in ps): choco install openssl
#3. Run this shell script!