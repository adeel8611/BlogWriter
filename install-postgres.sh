#!/bin/bash

# PostgreSQL Installation Script for BlogWriter
# Run this script with sudo: sudo ./install-postgres.sh

echo "🔧 Installing PostgreSQL for BlogWriter..."
echo ""

# Update package list
apt update

# Install PostgreSQL
echo "📦 Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Install pgvector extension
echo "📦 Installing pgvector extension..."
apt install -y postgresql-14-pgvector || apt install -y postgresql-pgvector

# Start PostgreSQL service
echo "🚀 Starting PostgreSQL service..."
service postgresql start

# Enable PostgreSQL to start on boot
systemctl enable postgresql

echo ""
echo "✅ PostgreSQL installation complete!"
echo ""
echo "Next steps:"
echo "1. Create database: sudo -u postgres psql -c \"CREATE DATABASE blogwriter;\""
echo "2. Create user: sudo -u postgres psql -c \"CREATE USER blogwriter WITH PASSWORD 'password123';\""
echo "3. Grant privileges: sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE blogwriter TO blogwriter;\""
echo "4. Enable pgvector: sudo -u postgres psql -d blogwriter -c \"CREATE EXTENSION IF NOT EXISTS vector;\""
echo ""
echo "Or run: sudo ./setup-database.sh"
