const fs = require('fs')
const path = require('path')
const ts = require('typescript')
const uglifyJS = require("uglify-js");

var fsp = {
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
    targetBkbDefTs = path.join(projectPath, 'dist_ts', 'bkb.d.ts'),
    targetIndexDefTs = path.join(projectPath, 'dist_npm', 'index.d.ts'),
    //targetBkbJs = path.join(projectPath, 'dist', 'bkb.js'),
    targetBkbMinJs = path.join(projectPath, 'dist_npm', 'bkb.min.js')

  const readInterfacesTs = fsp.readFile(path.join(srcPath, 'interfaces.ts'))

  return makeTsCode(srcPath, readInterfacesTs).then(tsCode => {
    return fsp.writeFile(targetBkbTs, tsCode).then(() => tsCode)
  }).then((tsCode) => {
    const jsCode = ts.transpile(tsCode, {
      'module': ts.ModuleKind.UMD,
      'target': ts.ScriptTarget.ES5
    });
    //return fsp.writeFile(targetBkbJs, jsCode).then(() => jsCode)
    return jsCode
  }).then((jsCode) => {
    const minified = uglifyJS.minify(jsCode, {fromString: true});
    return fsp.writeFile(targetBkbMinJs, minified.code)
  }).then(() => makeTsDefCode(srcPath, readInterfacesTs)).then(tsCode => {
    return fsp.writeFile(targetBkbDefTs, tsCode)
  }).then(() => makeIndexTsDefCode(srcPath, readInterfacesTs)).then(tsCode => {
    return fsp.writeFile(targetIndexDefTs, tsCode)
  })
}

const exportsTsCode = `export {
  createApplication,
  Listener,
  Component,
  ComponentEvent,
  ComponentListener,
  ParentFilter,
  ChildFilter,
  NewComponentProperties,
  EmitterOptions,
  Context,
  Bkb,
  Log,
  ApplicationBkb,
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
    return `declare module 'bkb-framework' {
function createApplication<A>(obj?: any): A & Application<A>

${interfacesStr}

${exportsTsCode}
}`
  })
}

function makeIndexTsDefCode(srcPath, readInterfacesTs) {
  return readInterfacesTs.then(interfacesStr => {
    return `declare function createApplication<A>(obj?: any): A & Application<A>

${interfacesStr}

${exportsTsCode}`
  })
}

build(__dirname).then(() => {
  console.log('done')
}, (err) => {
  console.log(err.message, err.stack)
})
