#!/bin/bash
git pull
npm i
sudo systemctl restart "$1"
