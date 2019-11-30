## To-Do

* Rearchitect so that instead of wrapping React modules in a `Module`
  subclass with a `getComponent()` overridden method (what was I thinking?),
  legacy modules are wrapped in a React component. 

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

* Instead of trying to make codegen work with HMR and Babel and all of the
  sweet, sweet features we love, why not run a watcher process that copies
  the files we're interested in to a hidden folder and processes them there?
  Gets around symlinks, HMR failures, lets react-scripts do the hard work.

  * But maybe we can do the same thing by forking react-scripts, adding a
    custom loader, and *maybe* working with the `module.hot` API. This
    would get rid of the messiness of watching files and running a separate
    process.