#!/bin/bash

curl -s --output /dev/null http://localhost:4040/api/tunnels || ngrok http 8080 1>/dev/null 2>&1 &
sleep 1
npm start
