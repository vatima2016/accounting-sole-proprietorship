#!/bin/bash

echo "📁 Creating all project files..."

# This script will be run to generate all files
# It calls individual file creation scripts

cd "$(dirname "$0")"

# Source the file creators
source ./scripts/create-backend-core.sh
source ./scripts/create-backend-db.sh  
source ./scripts/create-frontend-core.sh
source ./scripts/create-frontend-components.sh

echo "✅ All files created successfully!"

