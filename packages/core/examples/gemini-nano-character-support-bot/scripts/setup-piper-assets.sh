#!/usr/bin/env bash

set -euo pipefail

readonly ASSET_URL='https://github.com/shinshin86/chrome-on-aituber/releases/download/piper-assets-v2/piper-assets.tar.gz'
readonly ASSET_SHA256='dbaad1236b9e3b53d625860134a09c078e9a7d92888aaefe83cf5e02c4760030'
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly EXAMPLE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly PUBLIC_DIR="${EXAMPLE_DIR}/public"
readonly TARGET_DIR="${PUBLIC_DIR}/piper"
readonly ASSET_MANIFEST="${SCRIPT_DIR}/piper-assets-manifest.txt"
REQUIRED_FILES=()
REQUIRED_SIZES=()
while read -r expected_size relative_path; do
  if [[ -n "${expected_size}" && -n "${relative_path}" ]]; then
    REQUIRED_FILES[${#REQUIRED_FILES[@]}]="${relative_path}"
    REQUIRED_SIZES[${#REQUIRED_SIZES[@]}]="${expected_size}"
  fi
done < "${ASSET_MANIFEST}"
readonly REQUIRED_FILES REQUIRED_SIZES

file_matches_manifest() {
  local file_path="$1"
  local expected_size="$2"
  local actual_size

  [[ -f "${file_path}" ]] || return 1
  actual_size="$(wc -c < "${file_path}")"
  actual_size="${actual_size//[[:space:]]/}"
  [[ "${actual_size}" == "${expected_size}" ]]
}

calculate_sha256() {
  local file_path="$1"

  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "${file_path}" | awk '{ print $1 }'
    return
  fi

  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "${file_path}" | awk '{ print $1 }'
    return
  fi

  echo 'A SHA-256 utility (shasum or sha256sum) is required.' >&2
  return 1
}

force=0
case "${1:-}" in
  '')
    ;;
  --force)
    force=1
    ;;
  -h|--help)
    echo 'Usage: npm run setup:piper -- [--force]'
    exit 0
    ;;
  *)
    echo "Unknown option: ${1}" >&2
    echo 'Usage: npm run setup:piper -- [--force]' >&2
    exit 2
    ;;
esac

assets_complete=1
for index in "${!REQUIRED_FILES[@]}"; do
  relative_path="${REQUIRED_FILES[${index}]}"
  expected_size="${REQUIRED_SIZES[${index}]}"
  if ! file_matches_manifest \
    "${TARGET_DIR}/${relative_path}" \
    "${expected_size}"; then
    assets_complete=0
    break
  fi
done

if [[ -d "${TARGET_DIR}" && "${force}" -eq 0 ]]; then
  if [[ "${assets_complete}" -eq 1 ]]; then
    echo 'PiperPlus assets are already installed. Use --force to download them again.'
    exit 0
  fi

  echo 'The existing public/piper directory is incomplete.' >&2
  echo 'Run npm run setup:piper -- --force to replace it.' >&2
  exit 1
fi

temporary_dir="$(mktemp -d "${TMPDIR:-/tmp}/aituber-piper-assets.XXXXXX")"
trap 'rm -rf "${temporary_dir}"' EXIT

archive_path="${temporary_dir}/piper-assets.tar.gz"
staging_dir="${temporary_dir}/staging"
mkdir -p "${staging_dir}"

echo 'Downloading PiperPlus voice assets...'
curl \
  --fail \
  --location \
  --retry 3 \
  --retry-all-errors \
  --output "${archive_path}" \
  "${ASSET_URL}"

actual_sha256="$(calculate_sha256 "${archive_path}")"
if [[ "${actual_sha256}" != "${ASSET_SHA256}" ]]; then
  echo 'The downloaded archive failed its SHA-256 integrity check.' >&2
  exit 1
fi

if ! tar -tzf "${archive_path}" | awk '
  BEGIN { valid = 1 }
  $0 !~ /^piper(\/|$)/ || $0 ~ /(^|\/)\.\.(\/|$)/ { valid = 0 }
  END { exit valid == 0 ? 1 : 0 }
'; then
  echo 'The downloaded archive contains an unexpected path.' >&2
  exit 1
fi

tar -xzf "${archive_path}" -C "${staging_dir}"

for index in "${!REQUIRED_FILES[@]}"; do
  relative_path="${REQUIRED_FILES[${index}]}"
  expected_size="${REQUIRED_SIZES[${index}]}"
  if ! file_matches_manifest \
    "${staging_dir}/piper/${relative_path}" \
    "${expected_size}"; then
    echo "The downloaded archive has an invalid piper/${relative_path}." >&2
    exit 1
  fi
done

mkdir -p "${PUBLIC_DIR}"
if [[ -d "${TARGET_DIR}" ]]; then
  rm -rf "${TARGET_DIR}"
fi
mv "${staging_dir}/piper" "${TARGET_DIR}"

echo 'PiperPlus assets installed in public/piper/.'
