# Pinned official Nginx Alpine image with native ARM64 multi-arch support
FROM nginx:1.25-alpine

COPY default.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1
