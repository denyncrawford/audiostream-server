#!/bin/bash
set -e

{ # try
  cd ~/projects/audiostream-server &&
  git reset --hard &&
  git pull &&
  pnpm install &&
  pnpm build &&
  pm2 restart audiostream &&
  echo "Audiostream server updated"
} || { # catch
  echo "Error: Failed to update and build audiostream-server"
  exit 1
}