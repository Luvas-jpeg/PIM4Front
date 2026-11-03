#!/usr/bin/env bash
set -euo pipefail

image_name="${1:-pim4-front:ci}"
smoke_dir="$(mktemp -d)"
smoke_id="pim4-front-$(basename "$smoke_dir" | tr '[:upper:].' '[:lower:]-')"
front_container="$smoke_id-web"
upstream_container="$smoke_id-api"
smoke_network="$smoke_id-net"

cleanup() {
  result=$?
  if [ "$result" -ne 0 ]; then
    docker logs "$front_container" || true
    docker logs "$upstream_container" || true
  fi
  docker rm -f "$front_container" "$upstream_container" >/dev/null 2>&1 || true
  docker network rm "$smoke_network" >/dev/null 2>&1 || true
}
trap cleanup EXIT

mkdir -p "$smoke_dir/upstream/api"
printf '{"source":"ci-upstream"}\n' > "$smoke_dir/upstream/api/ci-probe.json"
docker network create "$smoke_network" >/dev/null
docker run --detach --name "$upstream_container" --network "$smoke_network" \
  --volume "$smoke_dir/upstream:/usr/share/nginx/html:ro" nginx:1.29-alpine >/dev/null
docker run --detach --name "$front_container" --network "$smoke_network" \
  --publish 127.0.0.1:8080:80 --env "API_UPSTREAM=http://$upstream_container" \
  "$image_name" >/dev/null

curl --fail --silent --show-error --retry 30 --retry-all-errors --retry-delay 2 \
  --max-time 5 http://127.0.0.1:8080/ --output "$smoke_dir/index.html"
curl --fail --silent --show-error --max-time 10 \
  http://127.0.0.1:8080/conta/pedido/123 --output "$smoke_dir/route.html"
cmp "$smoke_dir/index.html" "$smoke_dir/route.html"
curl --fail --silent --show-error --retry 10 --retry-all-errors --retry-delay 1 --max-time 5 \
  http://127.0.0.1:8080/api/ci-probe.json --output "$smoke_dir/proxy.json"
python3 - "$smoke_dir" <<'PY'
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
assert '<app-root' in root.joinpath('index.html').read_text(), 'Angular entry point missing'
assert json.loads(root.joinpath('proxy.json').read_text()) == {'source': 'ci-upstream'}, 'Proxy failed'
PY
printf 'Frontend image: Angular entry point, SPA fallback and API proxy verified.\n'
