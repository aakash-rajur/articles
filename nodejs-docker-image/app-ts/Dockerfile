FROM node:lts-alpine as BUILD

# don't want to run as root exposing ourselves to privilege escalation
USER node

# switch to user home directory to avoid permission issues, our app will be placed here
WORKDIR /home/node

# copying only package.json files to cache package installation step
COPY --chown=node package.json package-lock.json ./

RUN npm ci

COPY --chown=node build.tsconfig.json tsconfig.json ./

COPY --chown=node src/ src/

# removing dev dependencies because we don't need them in production
RUN npm run build && npm prune --production

FROM node:lts-alpine as MAIN

USER node

WORKDIR /home/node

# don't need package-lock.json
COPY --chown=node package.json .

# node_modules without dev dependencies
COPY --chown=node --from=BUILD /home/node/node_modules ./node_modules

# don't need the source code now
COPY --chown=node --from=BUILD /home/node/build ./build

ENTRYPOINT ["npm"]

CMD ["run", "start:prod"]
