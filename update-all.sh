#!/bin/bash
cd ../nowple-website/ || exit
sudo rm -r dist
git pull
npm i --production
ng build
sudo rm -r ../nowple-backend/client/*
sudo cp -r dist/nowple-website/* ../nowple-backend/client/
cd ../nowple-backend/ || exit
sudo systemctl stop nowple.service
git pull
npm i --production
sudo rm -r dist
npm run build
typeorm schema:sync
sudo systemctl start nowple.service
