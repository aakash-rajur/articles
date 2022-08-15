> production-grade node.js application container image

## goals
- reduce node js application container size by removing cache folder
- build node js production-grade container image

## outline
- [container background](#container)
- [node js image](#node-javascript-image)
- [node ts image](#node-typescript-image)

## container
- A `container` is a standard unit of software that packages up code and all its dependencies so the application runs 
  quickly and reliably from one computing environment to another [ref](https://www.docker.com/resources/what-container/)
- An `image` is a read-only template with instructions for creating a container [ref](https://docs.docker.com/get-started/overview/#images)
- A `Dockerfile` is a text document that contains all the commands a user could call on the command line to assemble an
  image [ref](https://docs.docker.com/engine/reference/builder/)
- Once you've an image, you can spawn a container of that image by invoking ```docker run -it -p 3000:8080 bitnami/nginx```. 
  Note, `bitnami/nginx` is a container from the hub that runs nginx, we'll replace this with our built image's name.

## node javascript image
[source](https://github.com/aakash-rajur/articles/tree/main/nodejs-docker-image/app-js)

### application
> a simple express app that spits out "hello world" on it's root path

```javascript
const express = require("express");

const app = express();

app.get("/", (req, res) => res.send("hello world"));

app.listen(3000, () => console.log("server up on port 3000"));
```

### folder structure
```bash
tree .
.
|-- Dockerfile
|-- index.js
|-- node_modules
|   ...
|-- package-lock.json
`-- package.json
```

### Dockerfile
```dockerfile
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
```

- run as user `node` to avoid privilege escalation vulnerability, i.e. if you run as root user, there's a chance of
  tampering with host filesystem
- use `/home/node` as our root directory to avoid permission conflicts while accessing or writing files
- copy only `package.json` and `package-lock.json` to cache package installation step every time we build this container
- <u>remove npm cache</u> by invoking `rm -rf /home/node/.npm`, we don't need this cache while running
- uncompressed size of this image is `114MB`
- build using ```docker build -t app-js . -f Dockerfile``` in project root directory, where `app-js` is name of your image
- run using ```docker run -it --rm -p 3000:3000 app-js```

## node typescript image
[source](https://github.com/aakash-rajur/articles/tree/main/nodejs-docker-image/app-ts)

### application
> a simple express app that spits out "hello world" on it's root path

```typescript
import express from "express";

const app = express();

app.get("/", (_, res) => res.send("hello world"));

app.listen(3000, () => console.log("server up on port 3000"));
```

### folder structure
```bash
tree
.
|-- Dockerfile
|-- build
|   `-- index.js
|-- build.tsconfig.json
|-- node_modules
|   ...
|-- package-lock.json
|-- package.json
|-- src
|   `-- index.ts
`-- tsconfig.json
```

### Dockerfile
```dockerfile
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
```

- multistage dockerfile aids in <u>ignoring files and folder that may have been generated or cached</u> while building 
  or by dev dependencies.
- run as user `node` to avoid privilege escalation vulnerability, i.e. if you run as root user, there's a chance of
  tampering with host filesystem
- use `/home/node` as our root directory to avoid permission conflicts while accessing or writing files
- build typescript application and prune dev dependencies keeping only the dependencies necessary to run our application
- copy only the build folder as we don't need src anymore
- uncompressed size of this image is `114MB`
- build using ```docker build -t app-ts . -f Dockerfile``` in project root directory, where `app-ts` is name of your image
- run using ```docker run -it --rm -p 3000:3000 app-ts```
