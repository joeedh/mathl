import {mathlLocalStorage, onLSFlush, onLSStart} from '../util/localStorage'

test('LS emulation test', async () => {
  await onLSStart()
  mathlLocalStorage.setItem('yay', 1.0)
  await onLSFlush()
})
