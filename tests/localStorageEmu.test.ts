import {localStorage, onLSFlush, onLSStart} from '../util/localStorage'

test('LS emulation test', async () => {
  await onLSStart()
  localStorage.setItem('yay', 1.0)
  await onLSFlush()
})
