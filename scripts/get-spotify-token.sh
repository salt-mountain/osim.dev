#!/bin/bash
# One-time script to get a Spotify refresh token
# Reads credentials from .env file in the repo root

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env file not found at $ENV_FILE"
  echo "Create one with SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET"
  exit 1
fi

CLIENT_ID=$(grep SPOTIFY_CLIENT_ID "$ENV_FILE" | cut -d'=' -f2)
CLIENT_SECRET=$(grep SPOTIFY_CLIENT_SECRET "$ENV_FILE" | cut -d'=' -f2)

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ]; then
  echo "Error: SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in .env"
  exit 1
fi

REDIRECT_URI="https://open.spotify.com/collection"
SCOPES="user-read-currently-playing user-read-recently-played"
ENCODED_SCOPES=$(echo "$SCOPES" | sed 's/ /%20/g')

AUTH_URL="https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=${ENCODED_SCOPES}"

echo ""
echo "1. Open this URL in your browser:"
echo ""
echo "   $AUTH_URL"
echo ""
echo "2. Log in and authorize the app"
echo "3. Copy the 'code' parameter from the redirect URL"
echo ""
read -p "   Code: " AUTH_CODE

echo ""
echo "Exchanging code for tokens..."

RESPONSE=$(curl -s -X POST https://accounts.spotify.com/api/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=${AUTH_CODE}" \
  -d "redirect_uri=${REDIRECT_URI}" \
  -d "client_id=${CLIENT_ID}" \
  -d "client_secret=${CLIENT_SECRET}")

REFRESH_TOKEN=$(echo "$RESPONSE" | grep -o '"refresh_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$REFRESH_TOKEN" ]; then
  echo ""
  echo "Error — could not get refresh token. Full response:"
  echo "$RESPONSE"
  exit 1
fi

echo ""
echo "Success! Your refresh token:"
echo ""
echo "   $REFRESH_TOKEN"
echo ""
echo "Add this to your .env file as SPOTIFY_REFRESH_TOKEN"
echo ""
