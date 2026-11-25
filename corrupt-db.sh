#!/usr/bin/env bash
# Corrupts the expo-updates database of this app on the booted iOS Simulator.
# Usage: ./corrupt-db.sh notadb     -> SQLite reports "file is not a database"
#        ./corrupt-db.sh malformed  -> SQLite reports "database disk image is malformed"
set -euo pipefail

BUNDLE_ID=com.example.updatescorruptdb
DIR="$(xcrun simctl get_app_container booted "$BUNDLE_ID" data)/Library/Application Support/.expo-internal"
DB=$(ls "$DIR"/expo-v*.db | head -1)

xcrun simctl terminate booted "$BUNDLE_ID" 2>/dev/null || true

case "${1:-notadb}" in
  notadb)
    # Overwrite the 16-byte SQLite header.
    printf 'XXXXXXXXXXXXXXXX' | dd of="$DB" bs=1 seek=0 conv=notrunc 2>/dev/null
    ;;
  malformed)
    # Keep the file header valid, and break the b-tree page header of every page from page 2 on.
    page_size=$((16#$(xxd -s 16 -l 2 -p "$DB")))
    pages=$(($(stat -f %z "$DB") / page_size))
    for ((page = 1; page < pages; page++)); do
      printf '\xff\xff\xff\xff\xff\xff\xff\xff' | dd of="$DB" bs=1 seek=$((page * page_size)) conv=notrunc 2>/dev/null
    done
    ;;
  *)
    echo "Usage: $0 notadb|malformed" >&2
    exit 1
    ;;
esac

echo "Corrupted $DB"
echo -n "sqlite3 says: "
sqlite3 "$DB" 'SELECT count(*) FROM updates;' 2>&1 || true
