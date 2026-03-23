/** Wire the X-Sim-Tick callback to the world store after it's initialized */
import { setTickCallback } from '@data/api/httpClient';
import { useWorldStore } from '@store/useWorldStore';

setTickCallback((tick) => {
  useWorldStore.getState().setTick(tick);
});
