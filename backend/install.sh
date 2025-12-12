#!/usr/bin/bash

source .env
wget https://github.com/pocketbase/pocketbase/releases/download/v0.34.2/pocketbase_0.34.2_linux_amd64.zip
unzip -j pocketbase_0.34.2_linux_amd64.zip pocketbase
rm pocketbase_0.34.2_linux_amd64.zip
./pocketbase superuser create $SUPERUSER_EMAIL $SUPERUSER_PASSWORD