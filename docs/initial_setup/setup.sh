#!/bin/bash

echo "🚀 Setting up Accounting Sole Proprietorship Project..."

# Create all directories
mkdir -p backend/src/{config,controllers,routes,services,utils}
mkdir -p backend/database/{migrations,seeds}
mkdir -p frontend/src/{components/{layout,transactions,reports,common},pages,services,hooks,utils}
mkdir -p frontend/public
mkdir -p docs

echo "✅ Directory structure created"

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
build/
dist/

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Editor
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Database
*.db
*.db-shm
*.db-wal
database/backups/

# OS
Thumbs.db
EOF

echo "✅ .gitignore created"

# Root package.json
cat > package.json << 'EOF'
{
  "name": "accounting-sole-proprietorship",
  "version": "1.0.0",
  "description": "Buchhaltung für Einzelunternehmer mit deutscher USt-Compliance",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "install:all": "npm install && cd backend && npm install && cd ../frontend && npm install",
    "build": "cd frontend && npm run build",
    "start": "cd backend && npm start"
  },
  "keywords": ["accounting", "bookkeeping", "vat", "germany", "einzelunternehmer"],
  "author": "",
  "license": "UNLICENSED",
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
EOF

echo "✅ Root package.json created"

echo ""
echo "📦 Project structure created successfully!"
echo ""
echo "Next steps:"
echo "1. Run: chmod +x create-backend.sh create-frontend.sh"
echo "2. Run: ./create-backend.sh"
echo "3. Run: ./create-frontend.sh"
echo "4. Run: npm run install:all"
echo "5. Configure backend/.env with your Google Drive path"
echo "6. Run: cd backend && npm run db:init"
echo "7. Run: npm run dev"
echo ""

