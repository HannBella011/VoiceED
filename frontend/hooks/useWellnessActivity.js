'use client';

import { useBlockingLoading } from '@/components/shared/GlobalLoading';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { accountRequest } from '@/services/account';
import { MOODS, localDate, remainingSeconds } from '@/lib/wellness';

// Legacy browser data is deliberately never imported or read.
export function useWellnessStorage(name, initialValue) {
  const { currentUser } = useAuthContext();
  const [value, setValue] = useState(initialValue);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useBlockingLoading(Boolean(currentUser?.id) && (saving || (!ready && !error)));
  const current = useRef(initialValue);
  const busy = useRef(false);
  const activeKey = useRef(`${currentUser?.id}:${name}`);
  activeKey.current = `${currentUser?.id}:${name}`;
  const identity = useRef(currentUser?.id);
  identity.current = currentUser?.id;
  const load = useCallback(async () => {
    const owner = currentUser?.id;
    if (!owner) return;
    let next;
    if (name === 'moods' || name === 'journals') {
      const rows = [];
      for (let page = 1; ; page++) {
        const batch = await accountRequest(
          `/wellness/${name === 'moods' ? 'moods' : 'journal'}?limit=100&page=${page}`
        );
        rows.push(...batch);
        if (batch.length < 100) break;
      }
      next = rows.map((row) =>
        name === 'moods'
          ? {
              ...row,
              timestamp: row.recorded_at,
              emoji: Object.fromEntries(MOODS)[row.mood],
            }
          : { ...row, date: row.entry_date, timestamp: row.created_at }
      );
    } else {
      const day = name.startsWith('goals:') ? name.slice(6) : localDate();
      const rows = await accountRequest(`/wellness/goals?day=${day}`);
      next =
        name === 'custom-goals'
          ? rows.filter((row) => !row.preset_key)
          : Object.fromEntries(
              rows.map((row) => [row.preset_key || row.id, row.completed])
            );
      goalIds.current = Object.fromEntries(
        rows.map((row) => [row.preset_key || row.id, row.id])
      );
    }
    if (activeKey.current === `${owner}:${name}`) {
      current.current = next;
      setValue(next);
    }
  }, [name, currentUser?.id]);
  const goalIds = useRef({});
  useEffect(() => {
    let alive = true;
    current.current = initialValue;
    setValue(initialValue);
    setReady(false);
    setError('');
    load()
      .then(() => {
        if (alive) setReady(true);
      })
      .catch((err) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [load]);
  const update = useCallback(
    async (change) => {
      if (!ready || busy.current) return false;
      busy.current = true;
      setSaving(true);
      const ownerKey = activeKey.current;
      const request = (...args) => {
        if (activeKey.current !== ownerKey)
          throw new Error('Account changed. Please retry.');
        return accountRequest(...args);
      };
      try {
        const previous = current.current;
        const next = typeof change === 'function' ? change(previous) : change;
        if (name === 'moods' || name === 'journals') {
          const path = `/wellness/${name === 'moods' ? 'moods' : 'journal'}`;
          if (next.length === 0) await request(path, 'DELETE');
          else {
            for (const row of next.filter(
              (row) => !previous.some((old) => old.id === row.id)
            )) {
              await request(
                path,
                'POST',
                name === 'moods'
                  ? { mood: row.mood }
                  : {
                      title: 'Journal entry',
                      content: row.content,
                      mood: row.mood,
                      entry_date: row.date,
                    }
              );
            }
            for (const row of previous.filter(
              (row) => !next.some((item) => item.id === row.id)
            ))
              await request(`${path}/${row.id}`, 'DELETE');
          }
        } else if (name === 'custom-goals') {
          for (const row of next.filter(
            (row) => !previous.some((old) => old.id === row.id)
          ))
            await request('/wellness/goals', 'POST', { text: row.text });
          for (const row of previous.filter(
            (row) => !next.some((item) => item.id === row.id)
          ))
            await request(`/wellness/goals/${row.id}`, 'DELETE');
        } else {
          // Reload to pick up newly created/archived custom goals before changing progress.
          const rows = await request(`/wellness/goals?day=${name.slice(6)}`);
          for (const row of rows) {
            const key = row.preset_key || row.id;
            if (Boolean(next[key]) !== Boolean(row.completed))
              await request(`/wellness/goals/${row.id}/progress`, 'PUT', {
                day: name.slice(6),
                completed: Boolean(next[key]),
              });
          }
        }
        await load();
        setError('');
        return true;
      } catch (err) {
        setError(err.message);
        return false;
      } finally {
        busy.current = false;
        setSaving(false);
      }
    },
    [ready, name, load]
  );
  return [value, update, error, ready];
}

export function useLocalDay() {
  const [day, setDay] = useState(localDate);
  useEffect(() => {
    const timer = setInterval(() => setDay(localDate()), 30000);
    return () => clearInterval(timer);
  }, []);
  return day;
}

export function useCountdown(defaultMinutes) {
  const [duration, setDuration] = useState(defaultMinutes * 60);
  const [remaining, setRemaining] = useState(defaultMinutes * 60);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const deadline = useRef(null);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const next = remainingSeconds(deadline.current);
      setRemaining(next);
      if (next === 0) {
        setRunning(false);
        setCompleted(true);
      }
    };
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [running]);

  const start = () => {
    if (running) return;
    const seconds = remaining > 0 ? remaining : duration;
    deadline.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    setCompleted(false);
    setRunning(true);
  };
  const pause = () => {
    setRemaining(remainingSeconds(deadline.current));
    setRunning(false);
  };
  const select = (minutes) => {
    setDuration(minutes * 60);
    setRemaining(minutes * 60);
    setRunning(false);
    setCompleted(false);
  };
  const reset = () => {
    setRunning(false);
    setRemaining(duration);
    setCompleted(false);
  };
  return { duration, remaining, running, completed, start, pause, select, reset };
}
