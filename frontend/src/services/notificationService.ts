import api from '@/lib/api'
export interface NotificationPreference { notification_email:string; country:string; state:string; area:string; email_enabled:boolean }
export interface AppNotification { notification_id:string; title:string; message_text:string; country:string; state:string; area:string; target_url:string|null; created_at:string; is_read:boolean }
export interface NotificationFeed { unread_count:number; items:AppNotification[] }
export interface MarathonAvailability { available:boolean; message:string; items:AppNotification[] }
export const getPreferences=async()=> (await api.get<NotificationPreference|null>('/notifications/preferences')).data
export const savePreferences=async(p:NotificationPreference)=> (await api.put<NotificationPreference>('/notifications/preferences',p)).data
export const getNotifications=async()=> (await api.get<NotificationFeed>('/notifications')).data
export const getMarathonAvailability=async()=> (await api.get<MarathonAvailability>('/notifications/marathons')).data
export const markRead=async(ids?:string[])=> (await api.post('/notifications/read',{notification_ids:ids??null})).data
