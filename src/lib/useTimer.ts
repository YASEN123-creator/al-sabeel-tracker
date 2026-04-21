'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { createSession } from '@/lib/api';

async function notify(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '⏰', silent: true });
  } else if (Notification.permission !== 'denied') {
    const p = await Notification.requestPermission();
    if (p === 'granted') new Notification(title, { body, icon: '⏰', silent: true });
  }
}

export function useTimer() {
  const timerState = useAppStore(s => s.timerState);
  const workDur = (useAppStore(s => s.settings?.pomodoro_work_duration || 25)) * 60;
  const breakDur = (useAppStore(s => s.settings?.pomodoro_break_duration || 5)) * 60;
  const addSession = useAppStore(s => s.addSession);
  const setTimerState = useAppStore(s => s.setTimerState);
  const setTimerSeconds = useAppStore(s => s.setTimerSeconds);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimestampRef = useRef(0);
  const remainingAtStartRef = useRef(0);
  const startRef = useRef('');

  const getRemaining = useCallback(() => {
    if (startTimestampRef.current === 0) return remainingAtStartRef.current;
    return Math.max(0, remainingAtStartRef.current - (Date.now() - startTimestampRef.current) / 1000);
  }, []);

  // Completion handler
  const completeRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    completeRef.current = async () => {
      const { timerState: ts, userId, activeProjectId, activeTaskId } = useAppStore.getState();
      const isBreak = ts === 'break';
      const remaining = getRemaining();
      const total = isBreak ? breakDur : workDur;
      const elapsed = total - remaining;

      if (!isBreak) {
        try {
          const session = await createSession(userId || '', {
            project_id: activeProjectId,
            task_id: activeTaskId,
            start_time: startRef.current,
            end_time: new Date().toISOString(),
            duration: Math.max(1, Math.round(elapsed / 60)),
            session_date: new Date().toISOString().split('T')[0],
          });
          addSession(session);
        } catch { /* silent */ }
        notify('انتهى وقت العمل! 🎉', 'أحسنت! خد استراحة');
        setTimerState('break');
        startTimestampRef.current = Date.now();
        remainingAtStartRef.current = breakDur;
        setTimerSeconds(breakDur);
      } else {
        notify('انتهت الاستراحة! ☕', 'يلا نكمل');
        setTimerState('idle');
        startTimestampRef.current = 0;
        remainingAtStartRef.current = workDur;
        setTimerSeconds(workDur);
      }
    };
  }, [workDur, breakDur, addSession, setTimerState, setTimerSeconds, getRemaining]);

  // Control functions - use useCallback so they update with dependencies
  const startTimer = useCallback(() => {
    if (useAppStore.getState().timerState === 'idle') {
      useAppStore.getState().setTimerSeconds(workDur);
      startRef.current = new Date().toISOString();
      startTimestampRef.current = Date.now();
      remainingAtStartRef.current = workDur;
    }
    setTimerState('running');
  }, [workDur, setTimerState]);

  const pauseTimer = useCallback(() => {
    const r = getRemaining();
    remainingAtStartRef.current = r;
    useAppStore.getState().setTimerSeconds(Math.ceil(r));
    startTimestampRef.current = 0;
    setTimerState('paused');
  }, [getRemaining, setTimerState]);

  const resumeTimer = useCallback(() => {
    startTimestampRef.current = Date.now();
    setTimerState('running');
  }, [setTimerState]);

  const skipTimer = useCallback(() => {
    const state = useAppStore.getState().timerState;
    if (state === 'running' || state === 'break' || state === 'paused') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      completeRef.current();
    } else {
      setTimerState('idle');
      setTimerSeconds(workDur);
      startTimestampRef.current = 0;
      remainingAtStartRef.current = workDur;
    }
  }, [workDur, setTimerState, setTimerSeconds]);

  const resetTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerState('idle');
    setTimerSeconds(workDur);
    startTimestampRef.current = 0;
    remainingAtStartRef.current = workDur;
  }, [workDur, setTimerState, setTimerSeconds]);

  // Register controls in store whenever they change
  useEffect(() => {
    useAppStore.getState().setStartTimer(startTimer);
    useAppStore.getState().setPauseTimer(pauseTimer);
    useAppStore.getState().setResumeTimer(resumeTimer);
    useAppStore.getState().setSkipTimer(skipTimer);
    useAppStore.getState().setResetTimer(resetTimer);
  }, [startTimer, pauseTimer, resumeTimer, skipTimer, resetTimer]);

  // Timer interval
  useEffect(() => {
    if (timerState === 'running' || timerState === 'break') {
      intervalRef.current = setInterval(() => {
        const r = getRemaining();
        useAppStore.getState().setTimerSeconds(Math.ceil(r));
        if (r <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          completeRef.current();
        }
      }, 200);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerState, getRemaining]);

  // Visibility change
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        const state = useAppStore.getState().timerState;
        if (state === 'running' || state === 'break') {
          const r = getRemaining();
          useAppStore.getState().setTimerSeconds(Math.ceil(r));
          if (r <= 0) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            completeRef.current();
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [getRemaining]);

  // Request notification permission (silent)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
}
