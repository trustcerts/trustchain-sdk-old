#!/bin/bash

build_order=("core" "did-id-create" "wallet" "signature-verify" "template-verify" "claim-verify" "signature-create" "claim-create" "vc-revocation" "vc-create")

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
    echo "Start to build $package [$count/${#build_order[*]}]"
    cd $package
    if ! npm run build; then
        echo "Aborting build process after $package [$count/${#build_order[*]}]"
        break
    fi
    cd ..

    echo "Built $package [$count/${#build_order[*]}]"
    ((count++))
done