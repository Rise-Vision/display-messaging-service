#!/bin/bash
git pull
npm i
systemctl restart "$1"
