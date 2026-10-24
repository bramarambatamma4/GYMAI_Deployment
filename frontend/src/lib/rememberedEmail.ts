const KEY = 'gymai_last_email'
/** Email used on the last successful login / registration in this browser. */
export const getRememberedEmail = (): string => { try { return localStorage.getItem(KEY) ?? '' } catch { return '' } }
export const rememberEmail = (email: string): void => { try { localStorage.setItem(KEY, email.trim().toLowerCase()) } catch { /* private mode */ } }
