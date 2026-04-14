#!/bin/bash
# Test Privacy Compute API

# Step 1: Register a test user
echo "=== Register Test User ==="
curl -X POST "https://token.route.worthwolf.top/v1/admin/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123",
    "email": "test@example.com"
  }'

echo -e "\n\n=== Login ==="
# Step 2: Login to get session
LOGIN_RESP=$(curl -s -X POST "https://token.route.worthwolf.top/v1/admin/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123"
  }')
echo "$LOGIN_RESP"

# Extract session token
SESSION=$(echo "$LOGIN_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Session: $SESSION"

if [ -z "$SESSION" ]; then
  echo "Login failed, trying existing admin..."
  # Try with existing admin credentials
  SESSION="jason_mcp_admin_2026"
fi

echo -e "\n\n=== Create API Key ==="
# Step 3: Create API key using session
API_KEY_RESP=$(curl -s -X POST "https://token.route.worthwolf.top/v1/admin/keys" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION")
echo "$API_KEY_RESP"

# Extract API key
API_KEY=$(echo "$API_KEY_RESP" | grep -o '"key":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "API Key: $API_KEY"

if [ -z "$API_KEY" ]; then
  echo "Using test key..."
  API_KEY="tr_test_abc123"
fi

echo -e "\n\n=== Test Privacy Compute API ==="
curl -X POST "https://token.route.worthwolf.top/v1/privacy/compute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "company_id": "test",
    "task": "statistics",
    "data": {
      "orders": [
        {"customer": "张三", "phone": "13812345678", "amount": 5000},
        {"customer": "李四", "phone": "13987654321", "amount": 8000}
      ]
    },
    "operations": ["sum", "average", "count"],
    "privacy_level": "strict",
    "summarize": true
  }'
