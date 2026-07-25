import { useCallback, useMemo, useState } from 'react';

let idCounter = 1;

export default function useNotification(initial = []) {
  const [notifications, setNotifications] = useState(initial);

  const push = useCallback(({ type = 'info', message, duration = 4000 }) => {
    const id = `n_${Date.now()}_${idCounter++}`;
    setNotifications(prev => [{ id, type, message, duration }, ...prev]);
    return id;
  }, []);

  const remove = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clear = useCallback(() => setNotifications([]), []);

  const helpers = useMemo(() => ({ push, remove, clear }), [push, remove, clear]);

  return [notifications, helpers];
}
