#!/usr/bin/env bash
cd "$(dirname "$(realpath "$0")")" || exit

readarray names < <(jq -r "keys[]" list.json)
readarray urls < <(jq -r "values[]" list.json)

for i in "${!names[@]}"; do
    file=$(echo "${names[$i]}" | xargs).txt
    url=$(echo "${urls[$i]}" | xargs)
    curl "$url" > "$file"
done

curl https://raw.githubusercontent.com/ghostery/adblocker/master/packages/adblocker/assets/ublock-origin/resources.json > resources
