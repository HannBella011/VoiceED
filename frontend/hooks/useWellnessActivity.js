'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { localDate, remainingSeconds } from '@/lib/wellness';

export function useWellnessStorage(name, initialValue, validate = Array.isArray) {
  const { currentUser } = useAuthContext();
  const key = `voiceed:wellness:${currentUser.id}:${name}`;
  const initial = useRef(initialValue);
  const validator = useRef(validate);
  const current = useRef(initialValue);
  const [value, setValue] = useState(initialValue);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setReady(false);
    setError('');
    try {
      const stored = localStorage.getItem(key);
      const parsed = stored === null ? initial.current : JSON.parse(stored);
      if (!validator.current(parsed)) throw new Error('Invalid saved data');
      current.current = parsed;
      setValue(parsed);
    } catch {
      current.current = initial.current;
      setValue(initial.current);
      setError('Saved activity data could not be read from this browser.');
    }
    setReady(true);
  }, [key]);

  const update = useCallback(change => {
    if (!ready) return false;
    const next = typeof change === 'function' ? change(current.current) : change;
    try {
      localStorage.setItem(key, JSON.stringify(next));
      current.current = next;
      setValue(next);
      setError('');
      return true;
    } catch {
      setError('Your changes could not be saved. Browser storage may be full or disabled.');
      return false;
    }
  }, [key, ready]);

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
      if (next === 0) { setRunning(false); setCompleted(true); }
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
  const select = minutes => {
    setDuration(minutes * 60); setRemaining(minutes * 60);
    setRunning(false); setCompleted(false);
  };
  const reset = () => { setRunning(false); setRemaining(duration); setCompleted(false); };
  return { duration, remaining, running, completed, start, pause, select, reset };
}
