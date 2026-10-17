import {PassThrough} from 'node:stream'
import {setTimeout as delay} from 'node:timers/promises'

/**
 * Replace `process.stdin` with a pipe that delivers `chunks` one at a time,
 * a few milliseconds apart, the way a slow producer would. Returns a function
 * that restores the real stdin.
 */
export function mockStdin(...chunks: string[]): () => void {
  const original = Object.getOwnPropertyDescriptor(process, 'stdin') as PropertyDescriptor
  const stream = new PassThrough()
  Object.defineProperty(process, 'stdin', {configurable: true, value: stream})

  const write = async (): Promise<void> => {
    for (const chunk of chunks) {
      // eslint-disable-next-line no-await-in-loop -- chunks must arrive in order, apart
      await delay(5)
      stream.write(chunk)
    }

    stream.end()
  }

  void write()
  return () => Object.defineProperty(process, 'stdin', original)
}
