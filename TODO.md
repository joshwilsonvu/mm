## To-Do

* Allow this project to be used in two ways:
  * Legacy style, `git clone` to install, `git pull` to update,
    user config in `config/` and modules in `modules/`
  * Dependency style, `npm install`/`update`, modules in `modules/`
    or npm dependencies, run from npm scripts with `mm [--prod]`,
    `mm serve --port 8080`, `mm view --url localhost://8080`

* Reproduce all the default modules with React components

* Make running in development vs production transparent to the user
  except for speed and hot reloading
  * Self host in production if not `serve` or `view`: https://stackoverflow.com/a/43423171/7619380
  * Programmatically run `react-scripts` and `electron` concurrently in development

* Try forking react-scripts, adding a
    custom loader, and *maybe* working with the `module.hot` API. This
    would get rid of the messiness of watching files and running a separate
    process.

