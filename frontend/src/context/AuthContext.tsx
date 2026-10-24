import { clearWorkoutTimer } from '@/lib/workoutTimerStorage'
import { rememberEmail } from '@/lib/rememberedEmail'
import { createContext,useCallback,useContext,useEffect,useState,type ReactNode } from 'react'
import type { User } from '@/types'
import { loginUser,googleLogin,registerUser,verifyRegistration,logoutUser,fetchCurrentUser,updateCurrentUser,type ProfileUpdateData } from '@/services/authService'
interface AuthContextValue { user:User|null; isLoading:boolean; isAuthenticated:boolean; login:(e:string,p:string)=>Promise<void>; loginWithGoogle:(c:string)=>Promise<void>; register:(n:string,e:string,p:string)=>Promise<string>; verifyEmail:(e:string,c:string)=>Promise<void>; completeOAuth:(t:string)=>Promise<void>; updateUser:(p:ProfileUpdateData)=>Promise<User>; logout:()=>Promise<void>; error:string|null; clearError:()=>void }
const AuthContext=createContext<AuthContextValue|undefined>(undefined); const TOKEN_KEY='gymai_token',USER_KEY='gymai_user'
export function AuthProvider({children}:{children:ReactNode}){
 const [user,setUser]=useState<User|null>(null),[isLoading,setIsLoading]=useState(true),[error,setError]=useState<string|null>(null)
 const saveUser=useCallback((u:User)=>{localStorage.setItem(USER_KEY,JSON.stringify(u));setUser(u)},[])
 const persist=useCallback((token:string,u:User)=>{clearWorkoutTimer();localStorage.setItem(TOKEN_KEY,token);rememberEmail(u.email);saveUser(u)},[saveUser])
 useEffect(()=>{const stored=localStorage.getItem(USER_KEY),token=localStorage.getItem(TOKEN_KEY);if(stored&&token){setUser(JSON.parse(stored));fetchCurrentUser().then(saveUser).catch(()=>{localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(USER_KEY);setUser(null)}).finally(()=>setIsLoading(false))}else setIsLoading(false)},[saveUser])
 const login=useCallback(async(email:string,password:string)=>{setError(null);try{const r=await loginUser(email,password);persist(r.access_token,r.user)}catch(err:any){setError(!err?.response?'Cannot reach the GymAI server.':err.response.data?.detail||'Invalid email or password.');throw err}},[persist])
 const loginWithGoogle=useCallback(async(credential:string)=>{setError(null);try{const r=await googleLogin(credential);persist(r.access_token,r.user)}catch(err:any){setError(!err?.response?'Cannot reach the GymAI server.':err.response.data?.detail||'Google sign-in failed.');throw err}},[persist])
 const register=useCallback(async(n:string,e:string,p:string)=>{setError(null);try{return (await registerUser(n,e,p)).email}catch(err:any){setError(!err?.response?'Cannot reach the GymAI server.':err.response.data?.detail||'Could not start registration.');throw err}},[])
 const verifyEmail=useCallback(async(e:string,c:string)=>{setError(null);try{const r=await verifyRegistration(e,c);persist(r.access_token,r.user)}catch(err:any){setError(!err?.response?'Cannot reach the GymAI server.':err.response.data?.detail||'Verification failed.');throw err}},[persist])
 const completeOAuth=useCallback(async(token:string)=>{try{localStorage.setItem(TOKEN_KEY,token);const u=await fetchCurrentUser();persist(token,u)}catch(err){localStorage.removeItem(TOKEN_KEY);throw err}},[persist])
 const updateUser=useCallback(async(p:ProfileUpdateData)=>{const u=await updateCurrentUser(p);saveUser(u);return u},[saveUser])
 const logout=useCallback(async()=>{try{await logoutUser()}catch{}finally{clearWorkoutTimer();localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(USER_KEY);setUser(null)}},[])
 return <AuthContext.Provider value={{user,isLoading,isAuthenticated:!!user,login,loginWithGoogle,register,verifyEmail,completeOAuth,updateUser,logout,error,clearError:()=>setError(null)}}>{children}</AuthContext.Provider>
}
export function useAuth(){const c=useContext(AuthContext);if(!c)throw new Error('useAuth must be used within AuthProvider');return c}
