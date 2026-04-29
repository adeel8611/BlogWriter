#!/bin/bash

# Database Setup Script for BlogWriter
# Run this script with sudo: sudo ./setup-database.sh

echo "🗄️  Setting up BlogWriter database..."
echo ""

# Create database
echo "Creating database 'blogwriter'..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS blogwriter;"
sudo -u postgres psql -c "CREATE DATABASE blogwriter;"

# Create user
echo "Creating user 'blogwriter'..."
sudo -u postgres psql -c "DROP USER IF EXISTS blogwriter;"
sudo -u postgres psql -c "CREATE USER blogwriter WITH PASSWORD 'password123';"

# Grant privileges
echo "Granting privileges..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE blogwriter TO blogwriter;"
sudo -u postgres psql -d blogwriter -c "GRANT ALL ON SCHEMA public TO blogwriter;"

# Enable pgvector extension
echo "Enabling pgvector extension..."
sudo -u postgres psql -d blogwriter -c "CREATE EXTENSION IF NOT EXISTS vector;"

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Database: blogwriter"
echo "User: blogwriter"
echo "Password: password123"
echo ""
echo "Next: Initialize the schema with: cd backend && npm run init-db"
