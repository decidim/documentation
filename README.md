
# Decidim Documentation 
**[WORK IN PROGRESS]**

**Source code** of the [Decidim Documentation website](https://decidim-docs.netlify.app/en/decidim/).

**Newcomers** will find a [getting started](#decidim-documentation) section, with different [tutorials](#decidim-documentation) to learn decidim basics.  
**Detailed information** will be available in  [administrator](#decidim-documentation)/[developper](#decidim-documentation)/[deployement](#decidim-documentation) guides.

**As a community**, you will find our [social contract](#decidim-documentation) and [contribution guideline](#decidim-documentation) to use or participate to decidim. There is a [wide number of way](#decidim-documentation) to give an appreciable help !  
Feel free to join us on [gitter](https://gitter.im/decidim/decidim).

_Documentation built with [Antora](https://antora.org), with XYZ licence._

## Index

- [Build source](#build-source)
- [Site overview](#site-overview)
- [Roadmap](#roadmap)

## Build source

- [Manually](#manually)
- [Docker](#docker)

### Manually

##### [Install antora](https://docs.antora.org/antora/2.3/install-and-run-quickstart/) with software dependencies.

```bash
# Install Node & npm using nvm
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
nvm install node

# Install Antora Command Line Interface (cli)
sudo npm i -g @antora/cli @antora/site-generator-default
```

If antora installation succeed, `antora -v` will return antora's version.

##### Build documentation website.

```bash
antora antora-playbook.yml
```
Jump to [site overview](#site-overview)

### Docker

Clone the repository and launch

```bash
docker run -u $(id -u) -v $PWD:/antora:Z --rm -t antora/antora antora-playbook.yml
```
Jump to [site overview](#site-overview)

## Site overview

When [sources are built](#build-source), documentation will be available under `build/site/decidim/index.html` by default.
You will have to serve `index.html` with any application or http server.  
_Example :_ 
```Bash
xdg-open build/site/decidim/index.html
```

## Roadmap 

This is a work in progress. This will be on production when we finish all the issues on the [MVP Milestone](https://github.com/decidim/docs-base/milestone/1).
