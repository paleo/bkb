const fs = require('fs')
const path = require('path')
const ts = require('typescript')
const uglifyJS = require('uglify-js')

const fsp = {
  exists: function (path) {
    return new Promise((resolve) => {
      fs.exists(path, (b) => {
        resolve(b)
      })
    })
  },
  mkdir: function (path) {
    return new Promise((resolve, reject) => {
      fs.mkdir(path, null, (err) => {
        if (err)
          reject(Error('Cannot create directory: ' + path))
        else
          resolve()
      })
    })
  },
  readdir: function (path) {
    return new Promise((resolve, reject) => {
      fs.readdir(path, (err, fileNames) => {
        if (err)
          reject(Error('Cannot read directory: ' + path))
        else
          resolve(fileNames)
      })
    })
  },
  readFile: function (fileName, options) {
    return new Promise((resolve, reject) => {
      fs.readFile(fileName, options, (err, data) => {
        if (err)
          reject(err)
        else
          resolve(data)
      })
    })
  },
  writeFile: function (fileName, data, options) {
    return new Promise((resolve, reject) => {
      fs.writeFile(fileName, data, options, (err) => {
        if (err)
          reject(err)
        else
          resolve()
      })
    })
  },
  unlink: function (fileName) {
    return new Promise((resolve, reject) => {
      fs.unlink(fileName, (err) => {
        if (err)
          reject(err)
        else
          resolve()
      })
    })
  },
  stat: function (path) {
    return new Promise((resolve, reject) => {
      fs.stat(path, (err, st) => {
        if (err)
          reject(err)
        else
          resolve(st)
      })
    })
  }
}

function build(projectPath) {
  const srcPath = path.join(projectPath, 'src'),
    targetBkbTs = path.join(projectPath, 'dist_ts', 'bkb.ts'),
    targetDistDefTs = path.join(projectPath, 'dist_ts', 'bkb.d.ts'),
    targetNpmDefTs = path.join(projectPath, 'dist_npm', 'bkb.d.ts'),
    //targetBkbJs = path.join(projectPath, 'dist', 'bkb.js'),
    targetBkbMinJs = path.join(projectPath, 'dist_npm', 'bkb.min.js')

  const readInterfacesTs = fsp.readFile(path.join(srcPath, 'interfaces.ts'))

  return makeTsCode(srcPath, readInterfacesTs).then(tsCode => {
    return fsp.writeFile(targetBkbTs, tsCode).then(() => tsCode)
  }).then((tsCode) => {
    const jsCode = ts.transpile(tsCode, {
      'module': ts.ModuleKind.CommonJS, // UMD
      'target': ts.ScriptTarget.ES5
      //'lib': ['dom', 'es5', 'es2015.core', 'es2015.iterable', 'es2015.collection', 'es2015.promise']
    })
    //return fsp.writeFile(targetBkbJs, jsCode).then(() => jsCode)
    return jsCode
  }).then((jsCode) => {
    const minified = uglifyJS.minify(jsCode, {fromString: true})
    return fsp.writeFile(targetBkbMinJs, minified.code)
  }).then(() => makeTsDefCode(srcPath, readInterfacesTs)).then(tsCode => {
    return fsp.writeFile(targetDistDefTs, tsCode)
  }).then(() => makeIndexTsDefCode(srcPath, readInterfacesTs)).then(tsCode => {
    return fsp.writeFile(targetNpmDefTs, tsCode)
  })
}

const exportsTsCode = `export {
  createApplication,
  toApplication,
  Component,
  ComponentEvent,
  Transmitter,
  ParentFilter,
  ChildFilter,
  NewComponentProperties,
  EmitterOptions,
  Dash,
  Bkb,
  LogItem,
  Log,
  ApplicationBkb,
  ApplicationDash,
  Application
}`

function makeTsCode(srcPath, readInterfacesTs) {
  return fsp.readdir(srcPath).then((files) => {
    return Promise.all(files.map((file) => {
      if (file === 'interfaces.ts')
        return readInterfacesTs
      return fsp.readFile(path.join(srcPath, file))
    }))
  }).then((contents) => {
    return contents.join('\n') + '\n\n' + exportsTsCode
  })
}

function makeTsDefCode(srcPath, readInterfacesTs) {
  return readInterfacesTs.then(interfacesStr => {
    return `declare module 'bkb' {
function createApplication<A>(Cl: { new(dash: ApplicationDash<A>, ...args: any[]): A }, ...args: any[]): A & Application
function toApplication<A>(obj: A): ApplicationDash<A>

${interfacesStr}

${exportsTsCode}
}`
  })
}

function makeIndexTsDefCode(srcPath, readInterfacesTs) {
  return readInterfacesTs.then(interfacesStr => {
    return `declare function createApplication<A>(Cl: { new(dash: ApplicationDash<A>, ...args: any[]): A }, ...args: any[]): A & Application
declare function toApplication<A>(obj: A): ApplicationDash<A>

${interfacesStr}

${exportsTsCode}`
  })
}

build(__dirname).then(() => {
  console.log('done')
}, err => console.log(err.message, err.stack))
