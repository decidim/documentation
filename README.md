
# Decidim Documentation

[![Netlify Status](https://api.netlify.com/api/v1/badges/d20ee965-1821-49c9-8e5a-f428133b5c39/deploy-status)](https://app.netlify.com/sites/decidim-documentation/deploys)

This is the repository for the [Decidim Documentation website](https://docs.decidim.org/). Is built with [Antora](https://antora.org/).

## Install locally

### Manually

[Install antora](https://docs.antora.org/antora/2.3/install-and-run-quickstart/) with software dependencies.

```bash
# Install Node and Npm, for instance using nvm:
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
nvm install node

# If antora installation succeed, `antora -v` will return antora's version.

# Clone repository and build documentation website.
git clone https://github.com/decidim/documentation
cd documentation

# Install Antora and dependencies
npm install

# build the static site
npm run build

# Serve the generated website (the content manager runs at /admin/)
npx serve build/site -l 8080

# The generated website will be create under ```build/site/``` folder. Open ```index.html``` with any browser.
xdg-open build/site/index.html
```

### Devcontainer

You can work locally using the development container.

```bash
git clone https://github.com/decidim/documentation
cd documentation
bin/devcontainer up
bin/devcontainer npm run build
npx serve build/site -l 8080
xdg-open build/site/index.html
```
