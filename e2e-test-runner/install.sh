#! /bin/bash
# http://stackoverflow.com/questions/59895
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT="$DIR/.."

cd $ROOT
sudo -u jenkins npm i

sudo cp "$DIR/display-messaging-e2e.service" "/etc/systemd/system/"
sudo cp "$ROOT/github-webhook/display-messaging-github-webhook@.service" "/etc/systemd/system/"

sudo cp "$ROOT/github-webhook/sudoers.d/"* /etc/sudoers.d/

sudo systemctl daemon-reload
sudo systemctl enable display-messaging-e2e.service
sudo systemctl enable display-messaging-github-webhook@display-messaging-e2e.service
sudo systemctl restart display-messaging-e2e.service
sudo systemctl restart display-messaging-github-webhook@display-messaging-e2e.service

sudo apt-get update && sudo apt-get -y install nginx
rm -f /etc/nginx/sites-enabled/*
cp "$DIR/nginx/github-hook-listener" /etc/nginx/sites-enabled/
sudo systemctl restart nginx
