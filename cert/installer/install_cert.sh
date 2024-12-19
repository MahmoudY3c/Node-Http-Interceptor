#!/bin/bash

# Check if the certificate path argument is provided
if [ -z "$1" ]; then
  echo "Usage: $(basename "$0") <cert_path>"
  exit 1
fi

# Store the certificate path from the argument
CERT_PATH="$1"

# Check if the script is run with sudo
if [ "$EUID" -ne 0 ]; then
  echo "Requesting administrative privileges..."
  sudo "$0" "$CERT_PATH"
  exit $?
fi

echo "Running with administrative privileges..."

# Add the certificate to the trusted store depending on the OS
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$CERT_PATH"
else
  # Linux (Debian/Ubuntu)
  sudo cp "$CERT_PATH" /usr/local/share/ca-certificates/$(basename "$CERT_PATH")
  sudo update-ca-certificates
fi

if [ $? -eq 0 ]; then
  echo "Certificate added successfully!"
else
  echo "Failed to add certificate."
fi
