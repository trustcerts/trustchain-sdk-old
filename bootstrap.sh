#!/bin/bash

build_order=("platform" "gateway" "observer" "core" "did-id-create" "wallet" "signature-verify" "template-verify" "claim-verify" "signature-create" "claim-create" "vc-revocation" "vc-create")

cd packages

for filename in *; do
    if [[ ${build_order[*]} =~ (^|[[:space:]])$filename($|[[:space:]]) ]]; then
        continue
    fi
    build_order+=($filename)
    rm -rf $filename/dist
done

count=1

for package in "${build_order[@]}"; do    
    if ! lerna bootstrap --force-local --scope=@trustcerts/$package; then
        echo "Aborting bootstrap process after $package [$count/${#build_order[*]}]"
        break
    fi

    echo "Bootstrapped $package [$count/${#build_order[*]}]"
    ((count++))
done