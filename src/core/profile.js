/**
 * 방문자 프로필(닉네임 · 아바타 색)을 localStorage 에만 저장한다.
 * 로그인도 서버 저장도 없다.
 */
import { AVATAR_COLORS } from './PlayerState.js';

const KEY = 'louvre-vr.profile.v1';
const MAX_NAME = 12;

export function loadProfile() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!raw) return null;
    return {
      name: sanitizeName(raw.name),
      color: AVATAR_COLORS.some((c) => c.hex === raw.color) ? raw.color : AVATAR_COLORS[0].hex,
    };
  } catch {
    return null;
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* 사생활 보호 모드 등에서 저장이 막혀도 관람에는 지장이 없다 */
  }
}

export function sanitizeName(value) {
  const trimmed = String(value ?? '').replace(/\s+/g, ' ').trim();
  return trimmed.slice(0, MAX_NAME) || '관람객';
}

export { MAX_NAME };
