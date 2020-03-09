const execa = require('execa');
const fs = require('fs-extra');
const path = require('path');
const tempy = require('tempy');
const getPort = require('get-port');
const os = require('os');
const stripAnsi = require('strip-ansi');
const waitForLocalhost = require('wait-for-localhost');

function stripYarn(output) {
  let lines = output.split('\n');

  let runIndex = lines.findIndex(line => line.match(/^yarn run/));
  if (runIndex !== -1) {
    lines.splice(0, runIndex + 2);
    lines = lines.filter(line => !line.match(/^info Visit.*yarnpkg/));
  }

  return lines.join('\n');
}

function execaSafe(...args) {
  return execa(...args)
    .then(({ stdout, stderr, ...rest }) => ({
      fulfilled: true,
      rejected: false,
      stdout: stripYarn(stripAnsi(stdout)),
      stderr: stripYarn(stripAnsi(stderr)),
      ...rest,
    }))
    .catch(err => ({
      fulfilled: false,
      rejected: true,
      reason: err,
      stdout: '',
      stderr: stripYarn(
        stripAnsi(
          err.message
            .split('\n')
            .slice(2)
            .join('\n')
        )
      ),
    }));
}

class Scripts {
  constructor(root) {
    this.root = root;
  }

  async start({ smoke = false, env = {} } = {}) {
    const port = await getPort();
    const options = {
      cwd: this.root,
      env: env,
    };

    if (smoke) {
      return await execaSafe('yarnpkg', ['start', '--smoke-test'], options);
    }
    const startProcess = execa('yarnpkg', ['start'], options);
    await waitForLocalhost({ port });
    return {
      port,
      done() {
        startProcess.kill('SIGKILL');
      },
    };
  }

  async build({ env = {} } = {}) {
    return await execaSafe('yarnpkg', ['build'], {
      cwd: this.root,
      env: Object.assign({}, { CI: 'false', FORCE_COLOR: '0' }, env),
    });
  }

  async serve() {
    const port = await getPort();
    const serveProcess = execa(
      'yarnpkg',
      ['serve', '--', '-p', port, '-s', 'build/'],
      {
        cwd: this.root,
      }
    );
    await waitForLocalhost({ port });
    return {
      port,
      done() {
        serveProcess.kill('SIGKILL');
      },
    };
  }

  async test({ jestEnvironment = 'jsdom', env = {} } = {}) {
    return await execaSafe(
      'yarnpkg',
      ['test', '--env', jestEnvironment, '--ci'],
      {
        cwd: this.root,
        env: Object.assign({}, { CI: 'true' }, env),
      }
    );
  }
};

class TestSetup {
  constructor(fixtureName, templateDirectory, { pnp = true } = {}) {
    this.fixtureName = fixtureName;

    this.templateDirectory = templateDirectory;
    this.testDirectory = null;
    this._scripts = null;

    this.setup = this.setup.bind(this);
    this.teardown = this.teardown.bind(this);

    this.isLocal = !(process.env.CI && process.env.CI !== 'false');
    this.settings = { pnp: pnp && !this.isLocal };
  }

  async setup() {
    await this.teardown();
    this.testDirectory = tempy.directory();
    await fs.copy(
      path.resolve(__dirname, '..', 'template'),
      this.testDirectory
    );
    await fs.copy(this.templateDirectory, this.testDirectory);
    await fs.remove(path.resolve(this.testDirectory, 'test.partial.js'));
    await fs.remove(path.resolve(this.testDirectory, '.disable-pnp'));

    const packageJson = await fs.readJson(
      path.resolve(this.testDirectory, 'package.json')
    );

    const shouldInstallScripts = !this.isLocal;
    if (shouldInstallScripts) {
      packageJson.dependencies = Object.assign({}, packageJson.dependencies, {
        'react-scripts': 'latest',
      });
    }
    packageJson.scripts = Object.assign({}, packageJson.scripts, {
      start: 'react-scripts start',
      build: 'react-scripts build',
      test: 'react-scripts test',
    });
    packageJson.license = packageJson.license || 'UNLICENSED';
    await fs.writeJson(
      path.resolve(this.testDirectory, 'package.json'),
      packageJson
    );

    await execa(
      'yarnpkg',
      [
        'install',
        this.settings.pnp ? '--enable-pnp' : null,
        '--mutex',
        'network',
      ].filter(Boolean),
      {
        cwd: this.testDirectory,
      }
    );

    if (!shouldInstallScripts) {
      await fs.ensureSymlink(
        path.resolve(
          path.resolve(
            __dirname,
            '../../../..',
            'packages',
            'react-scripts',
            'bin',
            'react-scripts.js'
          )
        ),
        path.join(this.testDirectory, 'node_modules', '.bin', 'react-scripts')
      );
      await execa('yarnpkg', ['link', 'react-scripts'], {
        cwd: this.testDirectory,
      });
    }
  }

  get scripts() {
    if (this.testDirectory == null) {
      return null;
    }
    if (this._scripts == null) {
      this._scripts = new ReactScripts(this.testDirectory);
    }
    return this._scripts;
  }

  async teardown() {
    if (this.testDirectory != null) {
      try {
        await fs.remove(this.testDirectory);
      } catch (ex) {
        if (this.isLocal) {
          throw ex;
        } else {
          // In CI, don't worry if the test directory was not able to be deleted
        }
      }
      this.testDirectory = null;
      this._scripts = null;
    }
  }
};

module.exports = TestSetup;