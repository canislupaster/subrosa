export $(cat .deployenv | xargs)
npm i && npm run build \
&& rsync -urchavzP --stats . $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH --include='**.gitignore' --exclude='/.git' --filter=':- .gitignore' --delete-after \
&& rsync -urchavzP --stats ./dist/* $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/dist \
&& ssh -tt $REMOTE_USER@$REMOTE_HOST "
	sudo supervisorctl -c $SUPERVISOR_CONF stop $SUPERVISOR_NAME
	sudo supervisorctl -c $SUPERVISOR_CONF start $SUPERVISOR_NAME
"