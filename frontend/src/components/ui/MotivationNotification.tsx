import { useEffect, useState } from 'react'
import { HeartPulse, X } from 'lucide-react'
const messages=[
 ['Consistency beats intensity.','Show up today. Your next level is built one session at a time.'],
 ['Strong habits create strong bodies.','Keep moving, recover well, and make your next rep count.'],
 ['Your future self is built by what you do today.','Stay patient. Stay consistent. Keep training.'],
 ['Move with purpose. Train with patience.','Small improvements repeated often become real progress.'],
 ['One more rep. One more step.','Progress compounds when you keep going.'],
]
export function MotivationNotification(){const[visible,setVisible]=useState(false),[message,setMessage]=useState(messages[0]);useEffect(()=>{const id=window.setInterval(()=>{setMessage(messages[Math.floor(Math.random()*messages.length)]);setVisible(true);window.setTimeout(()=>setVisible(false),9000)},30000);return()=>window.clearInterval(id)},[]);if(!visible)return null;return <div className="motivation-toast" role="status"><div className="motivation-toast-icon"><HeartPulse size={18}/></div><div className="min-w-0"><p>{message[0]}</p><span>{message[1]}</span></div><button type="button" onClick={()=>setVisible(false)} aria-label="Close motivation"><X size={15}/></button></div>}
