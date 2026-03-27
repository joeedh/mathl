import {localStorage, onLSFlush, onLSStart} from '../util/localStorage'

test('LS emulation test', async () => {
  await onLSStart()
  console.log('LS', localStorage['yay'])
  await onLSFlush()
})