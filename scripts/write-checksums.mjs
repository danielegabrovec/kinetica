import { createReadStream } from 'node:fs'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { basename, join } from 'node:path'

const releaseDir = join(process.cwd(), 'release')
const packageJson = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8'))
const files = [`Kinetica-Setup-${packageJson.version}.exe`]

const installer = join(releaseDir, files[0])
const installerStat = await stat(installer)
if (installerStat.size < 10 * 1024 * 1024) {
  throw new Error(`Installer incompleto: ${files[0]} misura solo ${installerStat.size} byte.`)
}

async function sha256(path) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

const records = []
for (const file of files) {
  records.push(`${await sha256(join(releaseDir, file))}  ${basename(file)}`)
}

await writeFile(join(releaseDir, 'SHA256SUMS.txt'), `${records.join('\r\n')}\r\n`, 'utf8')
console.log(records.join('\n'))
