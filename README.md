
# Decidim Documentation 
**[WORK IN PROGRESS]**

**Source code** of the **[Decidim Documentation website](https://decidim-docs.netlify.app/en/decidim/)**.

**Newcomers** will find a **[getting started](#decidim-documentation)** section, with different **[tutorials](#decidim-documentation)** to **learn decidim basics**.  
**Detailed information** will be available in  **[administrator](#decidim-documentation)**/**[developper](#decidim-documentation)**/**[deployement](#decidim-documentation)** guides.

**As a community**, you will find our **[social contract](#decidim-documentation)** and **[contribution guideline](#decidim-documentation)** to use or participate to decidim. There is a [wide number of way](#decidim-documentation) to give an appreciable help !  
Feel free to join us on [gitter](https://gitter.im/decidim/decidim).

_Documentation built with [Antora](https://antora.org), with XYZ licence._

## Install locally

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

##### Clone repository and build documentation website.

```bash
git clone https://github.com/decidim/docs-base
cd docs-base
antora antora-playbook.yml
```

Website source code will be create under ```docs-base/build/site/decidim``` folder. Serve ```index.html``` with any application or http server.

```bash
xdg-open build/site/decidim/index.html
```

### Docker

You can check this locally and install with Docker.

```bash
docker run -u $(id -u) -v $PWD:/antora:Z --rm -t antora/antora antora-playbook.yml
xdg-open build/site/decidim/index.html
```

## Roadmap 

This is a work in progress. This will be on production when we finish all the issues on the [MVP Milestone](https://github.com/decidim/docs-base/milestone/1).
