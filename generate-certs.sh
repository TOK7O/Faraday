#!/bin/bash
mkdir -p ssl

# Domyślny format (dla Mac/Linux)
SUBJECT="/CN=faraday-db"

# Sprawdzanie czy to Windows (Git Bash / MinGW)
# uname na Git Bashu zwraca np. MINGW64_NT-10.0
if [[ "$(uname)" == *"MINGW"* ]] || [[ "$(uname)" == *"MSYS"* ]]; then
    echo "Wykryto Windows (Git Bash) - stosowanie hacka ze ścieżką..."
    SUBJECT="//CN=faraday-db"
else
    echo "Wykryto system Unix (Mac/Linux) - standardowa ścieżka..."
fi

openssl req -new -x509 -days 36500 -nodes -text -out ssl/server.crt -keyout ssl/server.key -subj "$SUBJECT"

chmod 600 ssl/server.key
echo "Certs were generated in the ssl folder!"