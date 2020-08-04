
# Decidim Documentation 

[![Netlify Status](https://api.netlify.com/api/v1/badges/d20ee965-1821-49c9-8e5a-f428133b5c39/deploy-status)](https://app.netlify.com/sites/decidim-documentation/deploys)

This is the new repository for the [Decidim Documentation website](https://antora.org/):

Is built with [Antora](https://antora.org/), although for this version we're going to try to not have multi-repositories, as it's a hassle to work with. The idea is to have all the documents living on this same repository. 

This project is on active development and it's not on production yet.

For working with it, you can do it several ways: 

## Install locally 

### Manually

##### [Install antora](https://docs.antora.org/antora/2.3/install-and-run-quickstart/) with software dependencies.

```bash
# Install Node & npm using nvm
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
nvm install node

# Install Antora and dependencies
npm install
```

If antora installation succeed, `antora -v` will return antora's version.

##### Clone repository and build documentation website.

```bash
git clone https://github.com/decidim/documentation
cd documentation
./bin/build
```

Website source code will be create under ```documentation/build/site/decidim``` folder. Serve ```index.html``` with any application or http server.

```bash
xdg-open build/site/decidim/index.html
```

### Docker

You can check this locally and install with Docker.

```bash
git clone https://github.com/decidim/documentation
cd documentation
docker run -u $(id -u) -v $PWD:/antora:Z --rm -t antora/antora antora-playbook.yml
xdg-open build/site/decidim/index.html
```

## Roadmap 

This is a work in progress. This will be on production when we finish all the issues on the [MVP Milestone](https://github.com/decidim/documentation/milestone/1).
