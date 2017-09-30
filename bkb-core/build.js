const { promisify } = require("util")
const fs = require("fs")
const path = require("path")
//const ts = require("typescript")
const rollup = require("rollup")
const uglifyEs = require("uglify-es")

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const readdir = promisify(fs.readdir)
const mkdir = promisify(fs.mkdir)
const exists = promisify(fs.exists)

async function build(projectPath) {
  let srcPath = path.join(projectPath, "src"),
    compiledPath = path.join(projectPath, "compiled"),
    targetNpmDefTs = path.join(projectPath, "dist_npm", "bkb.d.ts"),
    targetBkbMinJs = path.join(projectPath, "dist_npm", "bkb.min.js")

  // process.chdir(projectPath)
  // require("typescript/lib/tsc")
  // console.log("Hop")

  // let jsCode = await ts.transpile(tsCode, {
  //   "module": ts.ModuleKind.ES2015,
  //   "target": ts.ScriptTarget.ES2017,
  //   "lib": [
  //     "dom",
  //     "es2016",
  //     "es2017.object"
  //   ],
  //   "strict": true,
  //   "noImplicitAny": false,
  //   "outDir": compiledPath,
  //   "include": [
  //     path.join(srcPath, "*.ts")
  //   ]
  // })

  if (!await exists(compiledPath))
    await mkdir(compiledPath)

  let interfacesStr = (await readFile(path.join(srcPath, "interfaces.ts"), "utf-8")).trim()

  let bundle = await rollup.rollup({
    input: path.join(compiledPath, "main.js")
  })
  let { code } = await bundle.generate({
    file: "test.js",
    format: "es",
    sourcemap: false
  })

  let minified = uglifyEs.minify(code)
  if (minified.error)
    throw minified.error
  await writeFile(targetBkbMinJs, minified.code)
  await writeFile(targetNpmDefTs, makeIndexTsDefCode(srcPath, interfacesStr))
}

function makeIndexTsDefCode(srcPath, interfacesStr) {
  return `export function createApplication<A>(Class: { new (dash: ApplicationDash<A>, ...args: any[]): A }, ...args: any[]): A
export function asApplication<A>(obj: A): ApplicationDash<A>

${interfacesStr}`
}

build(__dirname).then(() => {
  console.log("done")
}, err => console.log(err.message, err.stack))
