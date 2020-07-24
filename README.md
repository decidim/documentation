
# Decidim Documentation 

This is the new repository for the [Decidim Documentation website](https://antora.org/):

Is built with [Antora](https://antora.org/), although for this version we're going to try to not have multi-repositories, as it's a hassle to work with. The idea is to have all the documents living on this same repository. 

This project is on active development and it's not on production yet.

For working with it, you can do it several ways: 

## Install locally 

### Docker

You can check this locally and install with Docker. For doing this, you'll need to have Docker and docker-compose installed. 

```bash
git clone https://github.com/decidim/docs-base
cd docs-base
docker-compose up
cd build/site/decidim/
xdg-open index.html
```

### Manually

You can also work with this repository manually. For this you'll need nodeJS installed. We recommend using nvm for managing versions.

```bash
git clone https://github.com/decidim/docs-base
cd docs-base
npm i -g @antora/cli @antora/site-generator-default
antora antora-playbook.yml
cd build/site/decidim/
xdg-open index.html
```

## Roadmap 

This is a work in progress. This will be on production when we finish all the issues on the [MVP Milestone](https://github.com/decidim/docs-base/milestone/1).
