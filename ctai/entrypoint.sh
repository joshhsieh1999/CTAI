#!/bin/sh
# Run prisma migrations
npx prisma migrate dev --name init

# start app
HOSTNAME="0.0.0.0" node server.js