#!/usr/bin/env bash
# ========================================================
# Stock Trading Platform - Prerequisite Verification Script (Linux/macOS)
# ========================================================

echo "========================================================"
echo " Stock Trading Platform - Environment Diagnostics       "
echo "========================================================"

check_cmd() {
    local cmd=$1
    local name=$2
    if command -v "$cmd" >/dev/null 2>&1; then
        local ver
        ver=$("$cmd" --version 2>&1 | head -n 1)
        echo "  ✓ $name is available ($ver)"
    else
        echo "  ℹ $name not found in PATH"
    fi
}

echo "[1/6] Checking Docker Engine & Compose..."
if command -v docker >/dev/null 2>&1; then
    if docker info >/dev/null 2>&1; then
        echo "  ✓ Docker daemon is running"
    else
        echo "  ⚠ Docker CLI installed, but daemon is NOT running."
    fi
else
    echo "  ✗ Docker not found in PATH."
fi

if docker compose version >/dev/null 2>&1; then
    echo "  ✓ Docker Compose V2 is available"
else
    echo "  ✗ Docker Compose V2 not found."
fi

echo ""
echo "[2/6] Checking Java..."
check_cmd java "Java JDK"

echo ""
echo "[3/6] Checking Python..."
check_cmd python3 "Python"

echo ""
echo "[4/6] Checking Node.js..."
check_cmd node "Node.js"

echo ""
echo "[5/6] Checking Go..."
check_cmd go "Go"

echo ""
echo "[6/6] Checking CMake..."
check_cmd cmake "CMake"

echo ""
echo "========================================================"
echo "Run the platform with: docker compose up --build -d"
echo "========================================================"
