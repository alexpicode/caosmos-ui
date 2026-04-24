#!/bin/sh
set -e

# If VITE_API_BASE_URL is not defined, use the default value
: "${VITE_API_BASE_URL:=http://localhost:8080}"

echo "Configuring VITE_API_BASE_URL to: $VITE_API_BASE_URL"

# Search for all JS files in the Nginx assets directory
# and replace the placeholder with the actual value of the environment variable.
# We use | as a delimiter in sed in case the URL contains forward slashes /.
find /usr/share/nginx/html -name "*.js" -exec sed -i "s|PLACEHOLDER_VITE_API_BASE_URL|$VITE_API_BASE_URL|g" {} +

# Continue with the original command (usually nginx)
exec "$@"
