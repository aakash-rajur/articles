FROM node:lts-alpine as MAIN

# don't want to run as root exposing ourselves to privilege escalation
USER node

# switch to user home directory to avoid permission issues, our app will be placed here
WORKDIR /home/node

# copying only package.json files to cache package installation step
COPY --chown=node package.json package-lock.json ./

# installing packages, using 'ci' because we want exact versions to be installed
# npm caches installs `.npm` folder located within user home directory
RUN npm ci && rm -rf /home/node/.npm

# copying our code, can be directory as well
COPY index.js .

ENTRYPOINT ["npm"]

CMD ["start"]
