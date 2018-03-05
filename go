#!/bin/bash

ngrok http 8080 1>/dev/null 2>&1 &
open -a "/Applications/Google Chrome.app" 'http://127.0.0.1:4041/'

npm start
