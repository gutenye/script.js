import { merge as mergeObject } from 'lodash-es'
import Yaml from 'yaml'
import { fs } from '#/utils'

export const parse = Yaml.parse

export const stringify = Yaml.stringify

export async function readFile(path: string) {
  const text = (await fs.inputFile(path, 'utf8')) as string
  if (!text) {
    throw new Error(`input file not found: ${path}`)
  }
  return Yaml.parse(text)
}

export async function writeFile(path: string, data: any) {
  const text = Yaml.stringify(data)
  await fs.outputFile(path, text)
}

export async function mergeFiles(inputPaths: string[], outputPath: string) {
  const outputObject = {}
  for (const inputPath of inputPaths) {
    const text = (await fs.inputFile(inputPath, 'utf8')) as string
    if (!text) {
      throw new Error(`input file not found: ${inputPath}`)
    }
    const object = Yaml.parse(text)
    mergeObject(outputObject, object)
  }
  const outputText = Yaml.stringify(outputObject)
  await fs.outputFile(outputPath, outputText)
}

export async function copyFileWithoutComments(
  source: string,
  destination: string,
) {
  const text = (await fs.inputFile(source, 'utf8')) as string
  if (!text) {
    throw new Error(`input file not found: ${source}`)
  }
  const doc = Yaml.parseDocument(text)
  Yaml.visit(doc, {
    Node(key, node) {
      if ('comment' in node) node.comment = null
      if ('commentBefore' in node) node.commentBefore = null
    },
  })
  await fs.outputFile(destination, doc.toString())
}
