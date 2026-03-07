#!/usr/bin/env bash
# bootstrap-vps.sh — One-shot VPS setup for pi-3-b (sofplan.com.br)
# Run as root on a fresh Ubuntu 22.04 VPS.
# Usage: curl -fsSL https://raw.githubusercontent.com/rikelmy-matos/pi-3-b/main/scripts/bootstrap-vps.sh | bash

set -euo pipefail

REPO="https://github.com/rikelmy-matos/pi-3-b.git"
NAMESPACE="taskmanager"
RELEASE="taskmanager"
CHART_PATH="./helm/taskmanager"

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }

# ── 1. System packages ────────────────────────────────────────────────────────
info "Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq curl git unzip

# ── 2. k3s ────────────────────────────────────────────────────────────────────
if ! command -v k3s &>/dev/null; then
  info "Installing k3s..."
  curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable traefik" sh -
  # Give k3s a moment to settle
  sleep 10
  info "k3s installed: $(k3s --version)"
else
  info "k3s already installed: $(k3s --version)"
fi

export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# ── 3. Helm ───────────────────────────────────────────────────────────────────
if ! command -v helm &>/dev/null; then
  info "Installing Helm..."
  curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
  info "Helm installed: $(helm version --short)"
else
  info "Helm already installed: $(helm version --short)"
fi

# ── 4. Nginx Ingress Controller (k3s-compatible) ─────────────────────────────
info "Installing ingress-nginx..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx --force-update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.hostNetwork=true \
  --set controller.kind=DaemonSet \
  --wait --timeout 5m

# ── 5. cert-manager ───────────────────────────────────────────────────────────
info "Installing cert-manager..."
helm repo add jetstack https://charts.jetstack.io --force-update
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true \
  --wait --timeout 5m

# Create Let's Encrypt ClusterIssuer
info "Creating Let's Encrypt ClusterIssuer..."
kubectl apply -f - <<'EOF'
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@sofplan.com.br
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: nginx
EOF

# ── 6. Clone / update repository ─────────────────────────────────────────────
APP_DIR="/opt/pi-3-b"
if [ -d "$APP_DIR/.git" ]; then
  info "Updating repository at $APP_DIR..."
  git -C "$APP_DIR" pull --ff-only
else
  info "Cloning repository to $APP_DIR..."
  git clone "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"

# ── 7. Kubernetes namespace ───────────────────────────────────────────────────
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# ── 8. Image pull secret for ghcr.io ─────────────────────────────────────────
warn "=====================================================
You must provide a GitHub PAT with read:packages scope.
Set GHCR_TOKEN and GHCR_USER before this step, or the
imagePullSecret will be skipped.
====================================================="
if [[ -n "${GHCR_TOKEN:-}" && -n "${GHCR_USER:-}" ]]; then
  kubectl create secret docker-registry ghcr-credentials \
    --docker-server=ghcr.io \
    --docker-username="$GHCR_USER" \
    --docker-password="$GHCR_TOKEN" \
    --namespace="$NAMESPACE" \
    --dry-run=client -o yaml | kubectl apply -f -
  info "ghcr-credentials secret created."
else
  warn "GHCR_TOKEN / GHCR_USER not set — skipping imagePullSecret creation."
fi

# ── 9. Helm install / upgrade ─────────────────────────────────────────────────
warn "=====================================================
Set SECRET_KEY and DB_PASSWORD env vars before running
helm install, or edit values.yaml with production values.
====================================================="

SECRET_KEY="${SECRET_KEY:-CHANGE_ME_IN_PRODUCTION}"
DB_PASSWORD="${DB_PASSWORD:-CHANGE_ME_IN_PRODUCTION}"

info "Running helm upgrade --install for release '$RELEASE'..."
helm upgrade --install "$RELEASE" "$CHART_PATH" \
  --namespace "$NAMESPACE" \
  --set secrets.secretKey="$SECRET_KEY" \
  --set secrets.dbPassword="$DB_PASSWORD" \
  --wait --timeout 10m

info "Deployment complete!"
kubectl get pods -n "$NAMESPACE"
kubectl get ingress -n "$NAMESPACE"
