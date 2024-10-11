#!/bin/sh
# Run prisma migrations
npx prisma migrate dev --name init

# start app
HOSTNAME="0.0.0.0" npm run "${NPM_START_ENV}"