import fs from 'fs'
import path from 'path'

export const readSecret = (filepath: string) => fs.readFileSync(path.join(__dirname, '../..', filepath), 'utf8')
