export $(cat .deployenv | xargs)
npm i && npm run build
rsync -urchavzP --stats ./dist/* $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/