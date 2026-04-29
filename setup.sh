#!/bin/bash

# BlogWriter Setup Script
# This script helps you set up the BlogWriter application

echo "🚀 BlogWriter Setup Script"
echo "============================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ npm version: $(npm -v)"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
    echo "✅ Backend dependencies installed"
else
    echo "✅ Backend dependencies already installed"
fi
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
    echo "✅ Frontend dependencies installed"
else
    echo "✅ Frontend dependencies already installed"
fi
cd ..

# Check for .env file
if [ ! -f "backend/.env" ]; then
    echo "⚙️  Creating .env file from template..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please edit backend/.env with your configuration:"
    echo "   - Database credentials"
    echo "   - Anthropic API key"
    echo ""
    read -p "Press Enter to continue after editing .env file..."
else
    echo "✅ .env file exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure PostgreSQL is running and pgvector is installed"
echo "2. Create the database: createdb blogwriter"
echo "3. Initialize the database: cd backend && npm run init-db"
echo "4. Start the backend: cd backend && npm run dev"
echo "5. Start the frontend (new terminal): cd frontend && npm start"
echo ""
echo "📖 See README.md for detailed instructions"
