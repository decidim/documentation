
# Decidim Documentation

[![Netlify Status](https://api.netlify.com/api/v1/badges/d20ee965-1821-49c9-8e5a-f428133b5c39/deploy-status)](https://app.netlify.com/sites/decidim-documentation/deploys)

This is the repository for the [Decidim Documentation website](https://docs.decidim.org/). Is built with [Antora](https://antora.org/).

## Install locally

### Manually

[Install antora](https://docs.antora.org/antora/2.3/install-and-run-quickstart/) with software dependencies.

```bash
# Install Node & npm using nvm
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
nvm install node

# Install Antora and dependencies
npm install

# If antora installation succeed, `antora -v` will return antora's version.

# Clone repository and build documentation website.
git clone https://github.com/decidim/documentation
cd documentation
npm run build

# The generated website will be create under ```build/site/``` folder. Open ```index.html``` with any browser.
xdg-open build/site/index.html
```

### Docker

You can check this locally and install with Docker.

```bash
git clone https://github.com/decidim/documentation
cd documentation
./bin/dbuild
xdg-open build/site/index.html
```

