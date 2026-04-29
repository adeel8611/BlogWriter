#!/bin/bash

echo "🔍 Checking BlogWriter Setup..."
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node -v)"
else
    echo "❌ Node.js not found"
fi

# Check npm
if command -v npm &> /dev/null; then
    echo "✅ npm: $(npm -v)"
else
    echo "❌ npm not found"
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL: $(psql --version)"
else
    echo "❌ PostgreSQL not found - Run: sudo ./install-postgres.sh"
fi

# Check backend dependencies
if [ -d "backend/node_modules" ]; then
    echo "✅ Backend dependencies installed"
else
    echo "❌ Backend dependencies missing - Run: cd backend && npm install"
fi

# Check frontend dependencies
if [ -d "frontend/node_modules" ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Frontend dependencies missing - Run: cd frontend && npm install"
fi

# Check .env file
if [ -f "backend/.env" ]; then
    echo "✅ .env file exists"
else
    echo "❌ .env file missing - Copy from .env.example"
fi

echo ""
echo "📋 Next steps:"
echo "1. If PostgreSQL is missing: sudo ./install-postgres.sh"
echo "2. Setup database: sudo ./setup-database.sh"
echo "3. Initialize schema: cd backend && npm run init-db"
echo "4. Start backend: cd backend && npm run dev"
echo "5. Start frontend: cd frontend && npm start"
echo ""
echo "📖 See START_HERE.md for detailed instructions"
