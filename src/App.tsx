import { useEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from 'react'
import { ArrowLeft, ArrowRight, Bell, CalendarDays, Check, CheckCircle2, Clock3, Mail, MoreHorizontal, Paperclip, Plus, Search, Settings2, Sparkles, StickyNote, Sun, UserRound, X } from 'lucide-react'
import { emptyData, loadData, type Category, type ChronosData, type FileAttachment, type StickyNote as Note, type Task } from './model'
import { supabase } from './lib/supabase'
import type { User } from '@supabase/supabase-js'

const allowedAttachmentTypes = new Set(['image/jpeg','image/png','image/gif','image/webp','image/avif','image/heic','image/bmp','image/tiff','application/pdf'])
const maxAttachmentSize = 10 * 1024 * 1024
async function uploadAttachments(files: File[], userId: string, itemId: string): Promise<FileAttachment[]> {
  if (!files.length) return []
  if (!supabase || !userId) throw new Error('Entre na sua conta para anexar arquivos.')
  const uploaded: string[] = []
  try {
    const attachments: FileAttachment[] = []
    for (const file of files) {
      if (!allowedAttachmentTypes.has(file.type)) throw new Error('“' + file.name + '” não é uma imagem compatível ou PDF.')
      if (file.size > maxAttachmentSize) throw new Error('Cada arquivo pode ter no máximo 10 MB. “' + file.name + '” excede o limite.')
      const safeName = file.name.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').slice(-120) || 'arquivo'
      const path = userId + '/' + itemId + '/' + crypto.randomUUID() + '-' + safeName
      const { error } = await supabase.storage.from('chronos-attachments').upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false })
      if (error) throw new Error('Não foi possível enviar “' + file.name + '”. ' + error.message)
      uploaded.push(path)
      attachments.push({ id: crypto.randomUUID(), name: file.name, path, mimeType: file.type, size: file.size })
    }
    return attachments
  } catch (error) {
    if (uploaded.length) await supabase.storage.from('chronos-attachments').remove(uploaded)
    throw error
  }
}
const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const monthNames = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
const builtInCategories: Category[] = ['trabalho','pessoal','estudo','saude']
const categoryName: Record<string,string> = { trabalho:'Trabalho', pessoal:'Pessoal', estudo:'Estudos', saude:'Saúde' }
const categoryTone: Record<string,string> = { trabalho:'blue', pessoal:'pink', estudo:'purple', saude:'green' }
const getCategoryName = (category:Category) => categoryName[category] ?? category
const getCategoryTone = (category:Category) => categoryTone[category] ?? 'blue'
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const motivationalPhrases = [
  'Você não precisa fazer tudo hoje; só precisa dar o próximo passo.',
  'Cada pequeno avanço também é progresso.',
  'Seu ritmo é válido. Continue caminhando.',
  'Um dia de cada vez, uma conquista de cada vez.',
  'Começar com pouco é melhor do que esperar pelo momento perfeito.',
  'Você já superou dias difíceis antes. Confie na sua força.',
  'O progresso acontece quando você continua, mesmo devagar.',
  'Faça o que puder com o tempo e a energia que tem hoje.',
  'Seus esforços de hoje estão construindo novas possibilidades.',
  'Permita-se recomeçar quantas vezes forem necessárias.',
  'Você está mais perto do que imagina. Siga em frente.',
  'Uma pausa também faz parte de um caminho produtivo.',
  'Celebre o que conseguiu fazer, não apenas o que falta.',
  'A constância transforma pequenos passos em grandes mudanças.',
  'Hoje é uma nova oportunidade para cuidar do que importa.',
  'Não compare seu capítulo com a história de outra pessoa.',
  'Acredite no processo, mesmo quando o resultado ainda não apareceu.',
  'Você pode avançar sem ter todas as respostas agora.',
  'Sua dedicação merece reconhecimento, inclusive o seu.',
  'Recomeçar é uma forma de coragem.',
  'Vá com calma: o importante é não desistir de você.',
  'Todo objetivo fica mais possível quando vira um próximo passo.',
  'Você merece dar espaço aos seus sonhos na agenda.',
  'O melhor plano é aquele que respeita quem você é.',
  'Respire fundo. Você pode lidar com uma coisa de cada vez.',
  'A sua jornada não precisa ser perfeita para ser bonita.',
  'Confie: há valor em tudo que você está aprendendo.',
  'Pequenas escolhas feitas com intenção mudam os dias.',
  'Você pode fazer deste dia algo bom, do seu jeito.',
  'Continue. Seu futuro também é feito das escolhas de hoje.'
]
const getDailyMotivation = () => {
  const storageKey = 'chronos:motivational-phrase:v1'
  const date = dateKey(new Date())
  try {
    const previous = JSON.parse(localStorage.getItem(storageKey) || 'null') as { date?:string; phrase?:string } | null
    if (previous?.date === date && motivationalPhrases.includes(previous.phrase ?? '')) return previous.phrase!
    const choices = motivationalPhrases.filter(phrase => phrase !== previous?.phrase)
    const phrase = choices[Math.floor(Math.random() * choices.length)] ?? motivationalPhrases[0]
    localStorage.setItem(storageKey, JSON.stringify({ date, phrase }))
    return phrase
  } catch {
    return motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)]
  }
}
const noteCoversDate = (note: Note, date: string) => date >= note.date && date <= (note.endDate ?? note.date)
type UserProfile = { name: string; email: string; avatar?: string }
const today = new Date()
const prettyTime = (time: string) => time
const getYearMonthCells = (year:number,month:number):Array<Date|null> => {
  const first = new Date(year,month,1)
  const offset = (first.getDay()+6)%7
  const days = new Date(year,month+1,0).getDate()
  return [...Array.from({length:offset},()=>null),...Array.from({length:days},(_,index)=>new Date(year,month,index+1))]
}

function App() {
  const [data, setData] = useState<ChronosData>(() => loadData())
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!supabase)
  const [accountDataReady, setAccountDataReady] = useState(!supabase)
  const [authError, setAuthError] = useState('')
  const [view, setView] = useState<'calendar'|'space'>('calendar')
  const [spaceTab, setSpaceTab] = useState<'account'|'tasks'|'notes'>('account')
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(dateKey(today))
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<'task'|'note'|null>(null)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [calendarMode, setCalendarMode] = useState<'day'|'month'|'year'>('month')
  const [showNotifications, setShowNotifications] = useState(false)
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('chronos:dismissed-notifications:v1') || '[]') as string[] } catch { return [] } })
  const [showReminderSettings, setShowReminderSettings] = useState(false)
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours())
  const [dailyMotivation, setDailyMotivation] = useState(getDailyMotivation)
  const [reminderSettings, setReminderSettings] = useState(()=>{try{return JSON.parse(localStorage.getItem('chronos:reminders:v1')||'{"enabled":false,"timing":"30-min"}') as {enabled:boolean;timing:string}}catch{return {enabled:false,timing:'30-min'}}})
  const searchRef = useRef<HTMLInputElement>(null)
  const profilePhotoInput = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<UserProfile>(() => { try { return JSON.parse(localStorage.getItem('chronos:profile:v1') || '{"name":"Meu nome","email":""}') as UserProfile } catch { return {name:'Meu nome',email:''} } })

  useEffect(() => {
    const handleShortcut = (event:KeyboardEvent) => {
      if ((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k') { event.preventDefault(); searchRef.current?.focus() }
      if (event.key==='Escape') { setModal(null); setShowCategoryManager(false); setShowNotifications(false) }
    }
    window.addEventListener('keydown',handleShortcut)
    return () => window.removeEventListener('keydown',handleShortcut)
  },[])

  useEffect(() => {
    const timer = window.setInterval(() => { setCurrentHour(new Date().getHours()); setDailyMotivation(getDailyMotivation()) },60_000)
    return () => window.clearInterval(timer)
  },[])

  useEffect(() => {
    const client = supabase
    if (!client) return
    let active = true
    const loadAccount = async (user: User | null) => {
      if (!active) return
      setAuthUser(user)
      setAuthReady(false)
      setAccountDataReady(false)
      setAuthError('')
      if (!user) {
        setData(loadData())
        try { setProfile(JSON.parse(localStorage.getItem('chronos:profile:v1') || '{"name":"Meu nome","email":""}') as UserProfile) } catch { setProfile({name:'Meu nome',email:''}) }
        setAccountDataReady(true); setAuthReady(true); return
      }
      const profileKey = 'chronos:profile:' + user.id
      let accountProfile: UserProfile = { name: String(user.user_metadata?.full_name ?? 'Meu nome'), email: user.email ?? '' }
      try { const savedProfile = localStorage.getItem(profileKey) ?? localStorage.getItem('chronos:profile:v1'); if (savedProfile) accountProfile = { ...accountProfile, ...JSON.parse(savedProfile) as UserProfile, email: user.email ?? '' } } catch { /* use auth profile */ }
      setProfile(accountProfile)
      const { data: row, error } = await client.from('user_data').select('data').eq('user_id', user.id).maybeSingle()
      if (!active) return
      if (error) { setAuthError('Não foi possível carregar seus dados. Confira a conexão e tente novamente.'); setData(emptyData) }
      else if (row?.data) {
        const cloudData = row.data as ChronosData
        accountProfile = { ...accountProfile, ...(cloudData.profile ?? {}), email: user.email ?? '' }
        setProfile(accountProfile)
        setData(cloudData.profile ? cloudData : { ...cloudData, profile:{ name:accountProfile.name, avatar:accountProfile.avatar } })
        setAccountDataReady(true)
      }
      else {
        let cached: ChronosData = emptyData
        try { const saved = localStorage.getItem('chronos:user:' + user.id); if (saved) cached = JSON.parse(saved) as ChronosData } catch { /* use an empty account */ }
        accountProfile = { ...accountProfile, ...(cached.profile ?? {}), email: user.email ?? '' }
        setProfile(accountProfile)
        cached = { ...cached, profile:{ name:accountProfile.name, avatar:accountProfile.avatar } }
        setData(cached)
        const { error: saveError } = await client.from('user_data').upsert({ user_id: user.id, data: cached, updated_at: new Date().toISOString() })
        if (saveError && active) setAuthError('A conta entrou, mas não foi possível iniciar a sincronização dos dados.')
        else if (active) setAccountDataReady(true)
      }
      setAuthReady(true)
    }
    void client.auth.getSession().then(({ data: { session } }) => loadAccount(session?.user ?? null))
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => { void loadAccount(session?.user ?? null) })
    return () => { active = false; subscription.unsubscribe() }
  },[])

  useEffect(() => {
    const client = supabase
    if (!authReady || !accountDataReady || !authUser || !client) return
    const timer = window.setTimeout(async () => {
      try { localStorage.setItem('chronos:user:' + authUser.id, JSON.stringify(data)) } catch { /* cloud remains available */ }
      const { error } = await client.from('user_data').upsert({ user_id: authUser.id, data, updated_at: new Date().toISOString() })
      if (error) setAuthError('Não foi possível sincronizar agora. Suas alterações continuam neste dispositivo.')
      else setAuthError('')
    }, 500)
    return () => window.clearTimeout(timer)
  },[data,authUser,authReady,accountDataReady])
  const save = (next: ChronosData) => { setData(next); try { localStorage.setItem(authUser ? 'chronos:user:' + authUser.id : 'chronos:v1', JSON.stringify(next)) } catch { /* storage unavailable */ } }
  const monthDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const mondayOffset = (first.getDay()+6)%7
    return Array.from({length:42},(_,i)=>new Date(month.getFullYear(),month.getMonth(),1-mondayOffset+i))
  },[month])
  const calendarDays = useMemo(() => {
    if (calendarMode==='month') return monthDays
    const selectedDate = new Date(`${selected}T12:00:00`)
    if (calendarMode==='day') return [selectedDate]
    return []
  },[calendarMode,monthDays,selected])
  const yearMonths = useMemo(() => Array.from({length:12},(_,index)=>new Date(month.getFullYear(),index,1)),[month])
  const customCategories = data.customCategories ?? []
  const allCategories = [...builtInCategories,...customCategories]
  const categoryFilter = allCategories.includes(query) ? query : ''
  const textFilter = categoryFilter ? '' : query.trim().toLocaleLowerCase('pt-BR')
  const todaysTasks = data.tasks.filter(t=>t.date===selected&&(!categoryFilter||t.category===categoryFilter)&&(!textFilter||t.title.toLocaleLowerCase('pt-BR').includes(textFilter))).sort((a,b)=>a.time.localeCompare(b.time))
  const events = [
    ...data.appointments.filter(a=>a.date===selected&&(!categoryFilter||a.category===categoryFilter)&&(!textFilter||a.title.toLocaleLowerCase('pt-BR').includes(textFilter))).map(a=>({id:a.id,title:a.title,time:a.time,end:a.endTime,kind:'appointment' as const, category:a.category, place:a.place})),
    ...data.tasks.filter(t=>t.date===selected&&(!categoryFilter||t.category===categoryFilter)&&(!textFilter||t.title.toLocaleLowerCase('pt-BR').includes(textFilter))).map(t=>({id:t.id,title:t.title,time:t.time,end:'',kind:'task' as const,category:t.category,done:t.done})),
  ].sort((a,b)=>a.time.localeCompare(b.time))
  const doneCount = todaysTasks.filter(t=>t.done).length
  const todayKey = dateKey(today)
  const notificationStart = dateKey(new Date(today.getFullYear(),today.getMonth(),today.getDate()-7))
  const notificationLimit = dateKey(new Date(today.getFullYear(),today.getMonth(),today.getDate()+7))
  const notifications = [
    ...data.tasks.filter(task=>!task.done&&task.date>=notificationStart&&task.date<=notificationLimit).map(task=>({id:task.id,title:task.title,date:task.date,time:task.time,kind:'Tarefa' as const,category:task.category})),
    ...data.appointments.filter(appointment=>appointment.date>=todayKey&&appointment.date<=notificationLimit).map(appointment=>({id:appointment.id,title:appointment.title,date:appointment.date,time:appointment.time,kind:'Compromisso' as const,category:appointment.category})),
  ].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)).filter(item=>!dismissedNotifications.includes(`${item.kind}-${item.id}`)).slice(0,8)
  const dismissNotification = (kind:string,id:string) => {
    const key = `${kind}-${id}`
    if (dismissedNotifications.includes(key)) return
    const next = [...dismissedNotifications,key]
    setDismissedNotifications(next)
    try { localStorage.setItem('chronos:dismissed-notifications:v1',JSON.stringify(next)) } catch { /* storage unavailable */ }
  }
  const clearNotifications = () => {
    const next = [...new Set([...dismissedNotifications,...notifications.map(item=>`${item.kind}-${item.id}`)])]
    setDismissedNotifications(next)
    try { localStorage.setItem('chronos:dismissed-notifications:v1',JSON.stringify(next)) } catch { /* storage unavailable */ }
  }

  const toggleTask = (id: string) => save({...data,tasks:data.tasks.map(t=>t.id===id?{...t,done:!t.done}:t)})
  const addTask = async (title: string, date: string, time: string, category: Category, files: File[]) => {
    const id = crypto.randomUUID()
    const attachments = await uploadAttachments(files, authUser?.id ?? '', id)
    const task: Task = { id, title, time, date, category, done: false, attachments }
    save({ ...data, tasks: [...data.tasks, task] })
    setSelected(date); setMonth(new Date(date + 'T12:00:00')); setModal(null)
  }
  const addNote = async (title: string, content: string, date: string, endDate: string, files: File[]) => {
    const id = crypto.randomUUID()
    const attachments = await uploadAttachments(files, authUser?.id ?? '', id)
    const note: Note = { id, title, content, date, endDate, color: 'yellow', updatedAt: new Date().toISOString(), attachments }
    save({ ...data, notes: [note, ...data.notes] })
    setSelected(date); setMonth(new Date(date + 'T12:00:00')); setModal(null)
  }
  const updateNote = (id:string, patch:Partial<Note>) => save({...data,notes:data.notes.map(n=>n.id===id?{...n,...patch,updatedAt:new Date().toISOString()}:n)})
  const removeNote = (id: string) => {
    const note = data.notes.find(item => item.id === id)
    if (authUser && supabase && note?.attachments?.length) void supabase.storage.from('chronos-attachments').remove(note.attachments.map(file => file.path))
    save({ ...data, notes: data.notes.filter(item => item.id !== id) })
  }
  const addCategory = (name:string) => {
    const normalized = name.trim()
    if (!normalized || allCategories.some(c=>c.toLocaleLowerCase('pt-BR')===normalized.toLocaleLowerCase('pt-BR'))) return false
    save({...data,customCategories:[...customCategories,normalized]})
    return true
  }
  const removeCategory = (name:string) => {
    save({...data,customCategories:customCategories.filter(c=>c!==name),tasks:data.tasks.map(t=>t.category===name?{...t,category:'pessoal'}:t),appointments:data.appointments.map(a=>a.category===name?{...a,category:'pessoal'}:a)})
    if(query===name) setQuery('')
  }
  const changePeriod = (direction:-1|1) => {
    if(calendarMode==='month') { setMonth(new Date(month.getFullYear(),month.getMonth()+direction,1)); return }
    if(calendarMode==='year') { setMonth(new Date(month.getFullYear()+direction,month.getMonth(),1)); return }
    const next = new Date(`${selected}T12:00:00`)
    next.setDate(next.getDate()+direction)
    setSelected(dateKey(next))
    setMonth(new Date(next.getFullYear(),next.getMonth(),1))
  }
  const persistProfile = async (nextProfile:UserProfile) => {
    const cleaned:UserProfile = { ...nextProfile, name:nextProfile.name.trim() || 'Meu nome', email:authUser?.email ?? nextProfile.email }
    setProfile(cleaned)
    try { localStorage.setItem(authUser ? 'chronos:profile:' + authUser.id : 'chronos:profile:v1',JSON.stringify(cleaned)) } catch { /* account sync remains available */ }
    if (authUser && supabase) {
      const nextData = { ...data, profile:{ name:cleaned.name, avatar:cleaned.avatar } }
      setData(nextData)
      const { error } = await supabase.from('user_data').upsert({ user_id:authUser.id, data:nextData, updated_at:new Date().toISOString() })
      if (error) setAuthError('Não foi possível sincronizar seu perfil agora. Confira a conexão e tente novamente.')
      else setAuthError('')
    }
  }
  const saveProfile = () => { void persistProfile(profile) }
  const changeProfilePhoto = (file?:File) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        const scale = Math.min(1,512/Math.max(image.width,image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1,Math.round(image.width*scale))
        canvas.height = Math.max(1,Math.round(image.height*scale))
        canvas.getContext('2d')?.drawImage(image,0,0,canvas.width,canvas.height)
        const next = {...profile,avatar:canvas.toDataURL('image/jpeg',0.82)}

        void persistProfile(next)

      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  }
  const removeProfilePhoto = () => {
    const next = {...profile,avatar:undefined}

    void persistProfile(next)

  }
  const saveReminderSettings = (next:{enabled:boolean;timing:string}) => {
    setReminderSettings(next)
    localStorage.setItem('chronos:reminders:v1',JSON.stringify(next))
  }
  const headingDate = new Date(`${selected}T12:00:00`)
  const greeting = currentHour < 12 ? 'Bom dia' : currentHour < 18 ? 'Boa tarde' : 'Boa noite'
  const greetingEmoji = currentHour < 12 ? '☀️' : currentHour < 18 ? '🌤️' : '🌙'
  const openSpace = (tab:'account'|'tasks'|'notes'='account') => { setSpaceTab(tab); setView('space') }

  if (!authUser) return <div className="auth-gate"><AccountPanel profile={profile} setProfile={setProfile} saveProfile={saveProfile} photoInput={profilePhotoInput} changePhoto={changeProfilePhoto} removePhoto={removeProfilePhoto} authUser={authUser} authReady={authReady} authError={authError} onError={setAuthError} onSignOut={async()=>{if(supabase)await supabase.auth.signOut()}}/></div>
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={e=>{e.preventDefault();setView('calendar')}}><span className="brand-mark"><Clock3 size={22}/></span><span>chronos<span className="brand-period">.</span></span></a>
      <button className="new-button" onClick={()=>setModal('task')}><Plus size={18}/> Nova tarefa</button>
      <div className="nav-label">MENU</div>
      <nav className="main-nav">
        <button className={view==='calendar'?'active':''} onClick={()=>setView('calendar')}><CalendarDays size={18}/> Calendário</button>
        <button className={view==='space'?'active':''} onClick={()=>openSpace()}><UserRound size={18}/> Meu espaço</button>
      </nav>
      <div className="side-divider"/>
      <div className="nav-label category-label">CATEGORIAS <button onClick={()=>setShowCategoryManager(true)} title="Gerenciar categorias" aria-label="Gerenciar categorias"><Plus size={15}/></button></div>
      <div className="category-list">{allCategories.map(c=><button key={c} onClick={()=>{setQuery(query===c?'':c);openSpace('tasks')}} className={query===c?'filtered':''}><span className={`dot ${getCategoryTone(c)}`}/>{getCategoryName(c)}<span className="category-total">{data.tasks.filter(t=>t.category===c&&!t.done).length}</span></button>)}</div>
      <div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={16}/></div><b>Seu tempo, com intenção.</b><p>Pequenos passos todos os dias fazem a diferença.</p></div><button className="profile" onClick={()=>openSpace('account')}><span className="avatar">{profile.avatar?<img src={profile.avatar} alt=""/>:profile.name.trim().charAt(0).toUpperCase()||'?'}</span><span><b>{profile.name||'Seu perfil'}</b><small>Meu espaço</small></span><MoreHorizontal size={18}/></button></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">{view==='calendar'?'Início':'Meu espaço'} <span>/</span> <b>{view==='calendar'?'Calendário':spaceTab==='account'?'Conta':spaceTab==='tasks'?'Tarefas':'Post-it'}</b></div><div className="top-actions"><label className="search-box"><Search size={17}/><input ref={searchRef} placeholder="Buscar tarefa..." value={query&&!allCategories.includes(query)?query:''} onChange={e=>setQuery(e.target.value)} aria-label="Buscar tarefas e compromissos"/><kbd>Ctrl K</kbd></label><div className="notification-wrap"><button className="icon-button notification" aria-label={`Notificações${notifications.length?`, ${notifications.length} próximas`:''}`} title="Notificações" aria-expanded={showNotifications} onClick={()=>setShowNotifications(value=>!value)}><Bell size={18}/>{notifications.length>0&&<span className="notification-count">{notifications.length>9?'9+':notifications.length}</span>}</button>{showNotifications&&<section className="notification-popover" aria-label="Notificações"><div className="notification-popover-head"><div><b>Notificações</b><small>Próximos 7 dias</small></div><div className="notification-head-actions">{notifications.length>0&&<button className="clear-notifications" onClick={clearNotifications}>Limpar todas</button>}<button onClick={()=>setShowNotifications(false)} aria-label="Fechar notificações"><X size={15}/></button></div></div>{notifications.length?<div className="notification-list">{notifications.map(item=><div key={`${item.kind}-${item.id}`} className="notification-item"><button className="notification-open" onClick={()=>{setSelected(item.date);setMonth(new Date(`${item.date}T12:00:00`));setView('calendar');setShowNotifications(false)}}><span className={`dot ${getCategoryTone(item.category)}`}/><span className="notification-item-copy"><b>{item.title}</b><small>{item.kind} · {item.date===todayKey?'Hoje':new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})} às {item.time}</small></span><ArrowRight size={14}/></button><button className="notification-dismiss" aria-label={`Excluir notificação: ${item.title}`} title="Excluir notificação" onClick={()=>dismissNotification(item.kind,item.id)}><X size={14}/></button></div>)}</div>:<div className="notification-empty"><Bell size={19}/><b>Nenhuma notificação</b><span>Novos avisos aparecerão quando houver tarefas ou compromissos próximos.</span></div>}</section>}</div><button className="icon-button" aria-label="Conta" title="Conta" onClick={()=>openSpace('account')}><Settings2 size={18}/></button></div></header>

      {view==='space'&&<nav className="space-tabs" aria-label="Meu espaço"><button className={spaceTab==='account'?'selected':''} aria-current={spaceTab==='account'?'page':undefined} onClick={()=>setSpaceTab('account')}><UserRound size={16}/> Conta</button><button className={spaceTab==='tasks'?'selected':''} aria-current={spaceTab==='tasks'?'page':undefined} onClick={()=>setSpaceTab('tasks')}><CheckCircle2 size={16}/> Tarefas <span>{data.tasks.filter(task=>!task.done).length}</span></button><button className={spaceTab==='notes'?'selected':''} aria-current={spaceTab==='notes'?'page':undefined} onClick={()=>setSpaceTab('notes')}><StickyNote size={16}/> Post-it</button></nav>}

      {view==='calendar'&&<>
        <section className="welcome-row"><div><div className="eyebrow"><Sun size={15}/> UMA NOVA CHANCE DE FAZER ACONTECER</div><h1>{greeting}{profile.name&&profile.name!=='Meu nome'?`, ${profile.name.split(' ')[0]}`:''} <span>{greetingEmoji}</span></h1><p>{dailyMotivation}</p></div><button className="today-button" onClick={()=>{setMonth(new Date(today.getFullYear(),today.getMonth(),1));setSelected(dateKey(today))}}>Hoje <ArrowRight size={15}/></button></section>
        <div className={`dashboard-grid ${calendarMode==='year'?'year-mode':''}`}>
          <section className={`panel calendar-panel ${calendarMode==='year'?'year-calendar-panel':''}`}><div className="panel-head"><div><h2>{calendarMode==='year'?month.getFullYear():<>{monthNames[month.getMonth()]} <span>{month.getFullYear()}</span></>}</h2><p>{calendarMode==='month'?'Seu mês, no seu ritmo':calendarMode==='day'?'Seu dia, no seu ritmo':'Escolha um mês para abrir o calendário'}</p></div><div className="month-actions"><button onClick={()=>changePeriod(-1)} aria-label={calendarMode==='year'?'Ano anterior':'Período anterior'}><ArrowLeft size={16}/></button><button onClick={()=>changePeriod(1)} aria-label={calendarMode==='year'?'Próximo ano':'Próximo período'}><ArrowRight size={16}/></button><select className="view-select" aria-label="Visualização do calendário" value={calendarMode} onChange={e=>setCalendarMode(e.target.value as 'day'|'month'|'year')}><option value="day">Dia</option><option value="month">Mês</option><option value="year">Ano</option></select></div></div>
            {calendarMode==='year'?<div className="year-calendar-grid">{yearMonths.map((yearMonth,index)=>{const cells=getYearMonthCells(yearMonth.getFullYear(),index);return <section className="year-month-card" key={index}><button className="year-month-title" onClick={()=>{setMonth(yearMonth);setSelected(dateKey(yearMonth));setCalendarMode('month')}}>{monthNames[index]}</button><div className="year-weekdays">{weekdays.map((day,i)=><span key={`${day}-${i}`}>{day.slice(0,1)}</span>)}</div><div className="year-days">{cells.map((date,cellIndex)=>{if(!date)return <span key={`empty-${cellIndex}`}/>;const key=dateKey(date),marked=data.tasks.some(task=>task.date===key)||data.appointments.some(event=>event.date===key),note=data.notes.some(item=>noteCoversDate(item,key));return <button key={key} className={`${key===todayKey?'is-today':''} ${key===selected?'is-selected':''}`} aria-label={date.toLocaleDateString('pt-BR')} title={date.toLocaleDateString('pt-BR')+(note?' · Post-it':'')+(marked?' · Tarefa ou compromisso':'')} onClick={()=>{setMonth(new Date(date.getFullYear(),date.getMonth(),1));setSelected(key);setCalendarMode('day')}}>{date.getDate()}{(marked||note)&&<i/>}</button>})}</div></section>})}</div>:<><div className={`calendar-grid weekday-row ${calendarMode}`}>{calendarMode==='month'?weekdays.map(d=><div key={d}>{d}</div>):calendarDays.map(d=><div key={dateKey(d)}>{d.toLocaleDateString('pt-BR',{weekday:'short'})}</div>)}</div><div className={`calendar-grid date-grid ${calendarMode}`}>{calendarDays.map((d,i)=>{const key=dateKey(d),isToday=key===todayKey,hasTask=data.tasks.some(t=>t.date===key)||data.appointments.some(a=>a.date===key),note=data.notes.find(n=>noteCoversDate(n,key));return <button key={i} onClick={()=>{setSelected(key);if(calendarMode!=='month')setMonth(new Date(d.getFullYear(),d.getMonth(),1))}} aria-label={`${d.toLocaleDateString('pt-BR')}${note?`, post-it: ${note.title}`:''}`} className={`date-cell ${d.getMonth()!==month.getMonth()?'muted':''} ${key===selected?'selected':''} ${isToday?'today':''}`}><span>{d.getDate()}</span>{note&&<em className={`note-date-chip ${note.color}`} title={`${note.title}${note.endDate&&note.endDate!==note.date?` · ${note.date} a ${note.endDate}`:''}`}>{note.title}</em>}{hasTask&&<i/>}</button>})}</div></>}
            <div className="calendar-footer"><span><i className="legend-dot task-dot"/> Tarefas</span><span><i className="legend-dot event-dot"/> Compromissos</span><span><i className="legend-dot note-dot"/> Post-its</span></div>
          </section>

          <section className="panel day-panel"><div className="panel-head day-head"><div><div className="section-kicker">SUA AGENDA</div><h2>{headingDate.toLocaleDateString('pt-BR',{day:'2-digit',month:'long'})}<span className="year-inline">, {headingDate.getFullYear()}</span></h2><p>{events.length?`${events.length} momentos no seu dia`:'Um dia aberto para novas possibilidades'}</p></div><button className="add-small" onClick={()=>setModal('task')} title="Adicionar tarefa"><Plus size={18}/></button></div>
            {events.length?<div className="timeline">{events.slice(0,5).map((e,i)=><div className={`timeline-item ${i===0?'first':''}`} key={`${e.kind}-${e.id}`}><div className="time-label">{prettyTime(e.time)}</div><div className={`timeline-line ${i===events.length-1?'last':''}`}><i className={`timeline-dot ${getCategoryTone(e.category)}`}/></div><div className={`event-card ${e.kind==='task'?'task-card':''} ${e.category}`}><div className="event-meta"><span className={`event-chip ${getCategoryTone(e.category)}`}>{e.kind==='task'?'Tarefa':getCategoryName(e.category)}</span>{e.end&&<span className="event-duration">{e.time} – {e.end}</span>}</div><b>{e.title}</b>{e.kind==='appointment'&&e.place&&<small>{e.place}</small>}{e.kind==='task'&&<button className={`event-check ${e.done?'checked':''}`} onClick={()=>toggleTask(e.id)} aria-label={e.done?'Reabrir tarefa':'Concluir tarefa'}>{e.done&&<Check size={12}/>}</button>}</div></div>)}</div>:<div className="empty-day"><div className="empty-sun">☀</div><b>Seu dia está livre</b><p>Que tal reservar um tempo para você?</p><button onClick={()=>setModal('task')}><Plus size={15}/> Adicionar tarefa</button></div>}
            <button className="see-day" onClick={()=>openSpace('tasks')}>Ver todas as tarefas <ArrowRight size={15}/></button>
          </section>

          <section className="panel tasks-panel"><div className="panel-head compact-head"><div><div className="section-kicker">FOCO DE HOJE</div><h2>Suas tarefas</h2></div><button className="text-action" onClick={()=>openSpace('tasks')}>Ver todas <ArrowRight size={14}/></button></div><div className="progress-row"><div className="progress-track"><span style={{width:`${todaysTasks.length?doneCount/todaysTasks.length*100:0}%`}}/></div><span>{doneCount} de {todaysTasks.length} concluídas</span></div>
            <div className="task-list">{todaysTasks.slice(0,4).map(t=><TaskRow key={t.id} task={t} onToggle={()=>toggleTask(t.id)}/>)}{!todaysTasks.length&&<p className="no-tasks">Nenhuma tarefa por aqui. Aproveite o espaço. 🌿</p>}</div><button className="add-task-row" onClick={()=>setModal('task')}><Plus size={16}/> Adicionar tarefa</button>
          </section>

          <section className="panel notes-panel"><div className="panel-head compact-head"><div><div className="section-kicker">PENSE EM VOZ ALTA</div><h2>Seus post-its</h2></div><button className="icon-button mini" onClick={()=>setModal('note')} aria-label="Novo post-it"><Plus size={17}/></button></div><div className="note-preview-list">{data.notes.filter(n=>noteCoversDate(n,selected)).slice(0,2).map(n=><button key={n.id} className={`note-preview ${n.color}`} onClick={()=>openSpace('notes')}><span className="note-pin"/><b>{n.title}</b><p>{n.content.split('\n')[0]}</p></button>)}{!data.notes.some(n=>noteCoversDate(n,selected))&&<p className="no-tasks">Nenhum post-it nesta data. Clique em um dia do calendário.</p>}</div><button className="add-task-row note-add" onClick={()=>setModal('note')}><Plus size={16}/> Criar post-it nesta data</button></section>
        </div>
        <footer className="quote-footer"><span>“</span><p>Não é sobre ter tempo. É sobre fazer escolhas.</p><small>— Seu lembrete de hoje</small></footer>
      </>}

      {view==='space'&&spaceTab==='account'&&<AccountPanel profile={profile} setProfile={setProfile} saveProfile={saveProfile} photoInput={profilePhotoInput} changePhoto={changeProfilePhoto} removePhoto={removeProfilePhoto} authUser={authUser} authReady={authReady} authError={authError} onError={setAuthError} onSignOut={async()=>{if(supabase)await supabase.auth.signOut()}}/>}

      {view==='space'&&spaceTab==='tasks'&&<section className="full-view"><div className="welcome-row"><div><div className="eyebrow"><CheckCircle2 size={15}/> UM PASSO DE CADA VEZ</div><h1>Minhas tarefas <span>🌱</span></h1><p>Seu progresso, no seu ritmo.</p></div><button className="primary-button" onClick={()=>setModal('task')}><Plus size={16}/> Nova tarefa</button></div><div className="panel full-panel"><div className="panel-head"><div><h2>{headingDate.toLocaleDateString('pt-BR',{day:'2-digit',month:'long'})}</h2><p>{doneCount} de {todaysTasks.length} concluídas</p></div><button className="text-action" onClick={()=>setShowCategoryManager(true)}>Gerenciar categorias <Settings2 size={14}/></button></div><div className="task-category-filters"><button className={!categoryFilter?'selected-filter':''} onClick={()=>setQuery('')}>Todas</button>{allCategories.map(category=><button key={category} className={categoryFilter===category?'selected-filter':''} onClick={()=>setQuery(category)}><span className={`dot ${getCategoryTone(category)}`}/>{getCategoryName(category)}</button>)}</div>{todaysTasks.map(t=><TaskRow key={t.id} task={t} onToggle={()=>toggleTask(t.id)}/>)}{!todaysTasks.length&&<div className="empty-day"><b>Nenhuma tarefa neste dia</b><button onClick={()=>setModal('task')}><Plus size={15}/> Adicionar tarefa</button></div>}</div></section>}

      {view==='space'&&spaceTab==='notes'&&<section className="full-view"><div className="welcome-row"><div><div className="eyebrow"><StickyNote size={15}/> IDEIAS QUE MERECEM UM LUGAR</div><h1>Seus post-its <span>💡</span></h1><p>Anotações rápidas, organizadas por data.</p></div><button className="primary-button" onClick={()=>setModal('note')}><Plus size={16}/> Novo post-it</button></div><p className="notes-date-heading">{headingDate.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})} · {data.notes.filter(n=>noteCoversDate(n,selected)).length} post-it(s)</p><div className="notes-board">{data.notes.filter(n=>noteCoversDate(n,selected)).map(n=><NoteCard key={n.id} note={n} onSave={patch=>updateNote(n.id,patch)} onDelete={()=>removeNote(n.id)}/>)}<button className="add-note-card" onClick={()=>setModal('note')}><Plus size={22}/><span>Adicionar um post-it nesta data</span></button></div><p className="local-note"><span>●</span> Selecione uma data no calendário para ver os post-its ativos naquele dia. As datas inicial e final definem o período da nota.</p></section>}
    </main>
    {modal&&<Modal type={modal} categories={allCategories} selectedDate={selected} onClose={()=>setModal(null)} onAddTask={addTask} onAddNote={addNote}/>}
    {showCategoryManager&&<CategoryManager categories={allCategories} customCategories={customCategories} onClose={()=>setShowCategoryManager(false)} onAdd={addCategory} onRemove={removeCategory}/>}
  </div>
}

export default App

function TaskRow({task,onToggle}:{task:Task;onToggle:()=>void}) {
  return <div className={'task-row ' + (task.done?'is-done':'')}>
    <button className={'task-check ' + (task.done?'checked':'')} onClick={onToggle} aria-label={task.done?'Reabrir tarefa':'Concluir tarefa'}>{task.done&&<Check size={13}/>}</button>
    <span className={'task-color ' + getCategoryTone(task.category)}/>
    <div className="task-copy"><span className="task-title">{task.title}</span><AttachmentLinks attachments={task.attachments}/></div>
    <span className="task-time"><Clock3 size={13}/>{task.time}</span>
  </div>
}

function NoteCard({note,onSave,onDelete}:{note:Note;onSave:(p:Partial<Note>)=>void;onDelete:()=>void}) {
  const formatDate=(value:string)=>new Date(value+'T12:00:00').toLocaleDateString('pt-BR')
  return <article className={'note-card ' + note.color}>
    <div className="note-card-head"><span className="note-pin"/><button onClick={onDelete} aria-label="Excluir post-it"><X size={15}/></button></div>
    <input value={note.title} onChange={e=>onSave({title:e.target.value})} aria-label="Título do post-it"/>
    <textarea value={note.content} onChange={e=>onSave({content:e.target.value})} aria-label="Conteúdo do post-it"/>
    <AttachmentLinks attachments={note.attachments}/>
    <div className="note-period-fields"><label>De<input type="date" value={note.date} onChange={e=>onSave({date:e.target.value,endDate:(note.endDate??note.date)<e.target.value?e.target.value:note.endDate})}/></label><label>Até<input type="date" min={note.date} value={note.endDate??note.date} onChange={e=>onSave({endDate:e.target.value})}/></label></div>
    <div className="note-card-foot"><small>{note.date===note.endDate||!note.endDate?formatDate(note.date):formatDate(note.date)+' – '+formatDate(note.endDate)}</small><div className="color-choices">{(['yellow','pink','purple','green'] as const).map(c=><button key={c} className={'color-choice '+c+' '+(note.color===c?'chosen':'')} onClick={()=>onSave({color:c})} aria-label={'Cor '+c}/>)}</div></div>
  </article>
}

function AttachmentLinks({attachments}:{attachments?:FileAttachment[]}) {
  const [urls,setUrls]=useState<Record<string,string>>({})
  useEffect(()=>{
    let active=true
    const client=supabase
    if(!client||!attachments?.length){setUrls({});return()=>{active=false}}
    void Promise.all(attachments.map(async file=>{
      const {data,error}=await client.storage.from('chronos-attachments').createSignedUrl(file.path,3600)
      return error||!data?.signedUrl?null:[file.id,data.signedUrl] as const
    })).then(results => {
      if (active) {
        const available = results.filter((item): item is readonly [string, string] => item !== null)
        setUrls(Object.fromEntries(available))
      }
    })
    return()=>{active=false}
  },[attachments])
  if(!attachments?.length)return null
  return <div className="attachment-links" aria-label="Arquivos anexados">{attachments.map(file=><a key={file.id} className="attachment-link" href={urls[file.id]} target="_blank" rel="noreferrer" title={file.name} aria-disabled={!urls[file.id]} onClick={e=>{if(!urls[file.id])e.preventDefault()}}><Paperclip size={13}/><span>{file.name}</span><small>{file.mimeType==='application/pdf'?'PDF':file.mimeType==='image/gif'?'GIF':'Imagem'}</small></a>)}</div>
}

function Modal({type,categories,selectedDate,onClose,onAddTask,onAddNote}:{type:'task'|'note';categories:Category[];selectedDate:string;onClose:()=>void;onAddTask:(title:string,date:string,time:string,category:Category,files:File[])=>Promise<void>;onAddNote:(title:string,content:string,date:string,endDate:string,files:File[])=>Promise<void>}) {
  const [title,setTitle]=useState(''),[date,setDate]=useState(selectedDate),[endDate,setEndDate]=useState(selectedDate),[time,setTime]=useState('09:00'),[category,setCategory]=useState<Category>('trabalho'),[content,setContent]=useState('')
  const [files,setFiles]=useState<File[]>([]),[uploadError,setUploadError]=useState(''),[saving,setSaving]=useState(false)
  const task=type==='task'
  const addFiles=(selectedFiles:FileList|null)=>{
    if(!selectedFiles)return
    const next=[...files,...Array.from(selectedFiles)]
    const allowed=new Set(['image/jpeg','image/png','image/gif','image/webp','image/avif','image/heic','image/bmp','image/tiff','application/pdf'])
    const invalid=next.find(file=>!allowed.has(file.type))
    if(invalid){setUploadError('“'+invalid.name+'” não é uma imagem compatível ou PDF.');return}
    const tooLarge=next.find(file=>file.size>10*1024*1024)
    if(tooLarge){setUploadError('Cada arquivo pode ter no máximo 10 MB. “'+tooLarge.name+'” excede o limite.');return}
    if(next.length>5){setUploadError('Anexe até 5 arquivos por item.');return}
    setFiles(next);setUploadError('')
  }
  const submit=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault()
    if(!title.trim()||(!task&&endDate<date)||saving)return
    setSaving(true);setUploadError('')
    try{if(task)await onAddTask(title,date,time,category,files);else await onAddNote(title,content,date,endDate,files)}
    catch(error){setUploadError(error instanceof Error?error.message:'Não foi possível salvar os anexos. Tente novamente.')}
    finally{setSaving(false)}
  }
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!saving)onClose()}}>
    <form className="modal" onSubmit={submit}>
      <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar"><X size={18}/></button>
      <div className="modal-icon">{task?<CheckCircle2 size={20}/>:<StickyNote size={20}/>}</div>
      <div className="section-kicker">UM ESPAÇO PARA VOCÊ</div><h2>{task?'Nova tarefa':'Novo post-it'}</h2>
      <p>{task?'Organize o próximo passo do seu dia.':'Guarde uma ideia e escolha em quais dias ela deve aparecer.'}</p>
      <label>Título<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder={task?'Ex.: Preparar apresentação':'Ex.: Uma ideia importante'} required/></label>
      {task?<><div className="form-grid"><label>Dia<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label><label>Horário<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div><label>Categoria<select value={category} onChange={e=>setCategory(e.target.value as Category)}>{categories.map(c=><option key={c} value={c}>{getCategoryName(c)}</option>)}</select></label></>:<><label>Anotação<textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Escreva aqui..." rows={4}/></label><div className="form-grid"><label>Data inicial<input type="date" value={date} onChange={e=>{setDate(e.target.value);if(endDate<e.target.value)setEndDate(e.target.value)}} required/></label><label>Data final<input type="date" min={date} value={endDate} onChange={e=>setEndDate(e.target.value)} required/></label></div></>}
      <section className="attachment-picker-area">
        <div className="attachment-picker-heading"><strong>Arquivos</strong><span>GIF, imagem ou PDF · até 10 MB cada · máximo 5</span></div>
        <label className="attachment-picker"><Paperclip size={15}/>Selecionar arquivos<input type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp,image/avif,image/heic,image/bmp,image/tiff,application/pdf,.pdf" onChange={e=>{addFiles(e.target.files);e.currentTarget.value=''}}/></label>
        {files.length>0&&<ul className="selected-attachments">{files.map((file,index)=><li key={file.name+'-'+index}><span><Paperclip size={13}/>{file.name}<small>{(file.size/1024/1024).toFixed(1)} MB</small></span><button type="button" onClick={()=>setFiles(files.filter((_,i)=>i!==index))} aria-label={'Remover '+file.name}><X size={14}/></button></li>)}</ul>}
        {uploadError&&<p className="attachment-error" role="alert">{uploadError}</p>}
      </section>
      <div className="modal-actions"><button type="button" className="cancel-button" onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}><Plus size={16}/>{saving?'Enviando arquivos…':task?'Adicionar tarefa':'Criar post-it'}</button></div>
    </form>
  </div>
}

function CategoryManager({categories,customCategories,onClose,onAdd,onRemove}:{categories:Category[];customCategories:string[];onClose:()=>void;onAdd:(name:string)=>boolean|undefined;onRemove:(name:string)=>void}){const [name,setName]=useState(''),[error,setError]=useState('');return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><form className="modal category-modal" onSubmit={e=>{e.preventDefault();const added=onAdd(name);if(added){setName('');setError('Categoria adicionada.')}else setError('Digite um nome novo para a categoria.')}}><button type="button" className="modal-close" onClick={onClose} aria-label="Fechar"><X size={18}/></button><div className="modal-icon"><Settings2 size={20}/></div><div className="section-kicker">ORGANIZE SEU ESPAÇO</div><h2>Gerenciar categorias</h2><p>As categorias ajudam a filtrar as tarefas.</p><label>Nova categoria<input autoFocus value={name} onChange={e=>{setName(e.target.value);setError('')}} placeholder="Ex.: Família" maxLength={24}/></label><button className="primary-button category-add-button" type="submit"><Plus size={16}/>Adicionar categoria</button>{error&&<p className="category-feedback" role="status">{error}</p>}<div className="managed-categories">{categories.map(category=><div className="managed-category" key={category}><span className={`dot ${getCategoryTone(category)}`}/><span>{getCategoryName(category)}</span>{customCategories.includes(category)&&<button type="button" onClick={()=>onRemove(category)} aria-label={`Excluir categoria ${category}`}><X size={14}/></button>}</div>)}</div><div className="modal-actions"><button type="button" className="cancel-button" onClick={onClose}>Concluir</button></div></form></div>}

function ReminderSettingsPanel({settings,onSave}:{settings:{enabled:boolean;timing:string};onSave:(next:{enabled:boolean;timing:string})=>void}){return <section className="panel reminder-settings"><div><div className="section-kicker">PREFERÊNCIA SALVA NESTE DISPOSITIVO</div><h2>Quando lembrar você?</h2><p>Escolha se gostaria de receber um aviso antes das tarefas.</p></div><label className="reminder-toggle"><input type="checkbox" checked={settings.enabled} onChange={e=>onSave({...settings,enabled:e.target.checked})}/><span>Quero receber lembretes</span></label><label className="account-field reminder-timing">Antecedência<select value={settings.timing} onChange={e=>onSave({...settings,timing:e.target.value})}><option value="on-time">No horário da tarefa</option><option value="30-min">30 minutos antes</option><option value="1-day">Um dia antes</option></select></label><p className="account-footnote">A preferência está guardada. O envio por e-mail será ativado quando conectarmos o serviço de e-mail e o agendamento do Chronos.</p></section>}

function AccountPanel({profile,setProfile,saveProfile,photoInput,changePhoto,removePhoto,authUser,authReady,authError,onError,onSignOut}:{profile:UserProfile;setProfile:(p:UserProfile)=>void;saveProfile:()=>void;photoInput:RefObject<HTMLInputElement|null>;changePhoto:(f?:File)=>void;removePhoto:()=>void;authUser:User|null;authReady:boolean;authError:string;onError:(v:string)=>void;onSignOut:()=>Promise<void>}) {
  const [mode,setMode]=useState<'login'|'signup'>('signup'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
  const submit=async(e:FormEvent)=>{e.preventDefault();if(!supabase)return;setBusy(true);setMessage('');onError('');try{if(mode==='signup'){const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:`${window.location.origin}${import.meta.env.BASE_URL}`}});if(error){if(error.code==='user_already_exists'||/already registered|already exists/i.test(error.message)){setMessage('Já existe uma conta para este e-mail. Clique em Entrar.');return}throw error}if(data.user?.identities?.length===0){setMessage('Já existe uma conta para este e-mail. Clique em Entrar.');return}if(data.session)setMessage('Conta criada e conectada!');else setMessage('Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre.')}else{const {error}=await supabase.auth.signInWithPassword({email,password});if(error){if(error.code==='invalid_credentials'||/invalid login credentials/i.test(error.message)){setMessage('E-mail ou senha incorretos. Confira os dados e tente novamente.');return}throw error}setMessage('Entrada realizada.')}setPassword('')}catch(error){setMessage(error instanceof Error?error.message:'Não foi possível concluir. Confira os dados e tente novamente.')}finally{setBusy(false)}}
  return <section className="full-view"><div className="welcome-row"><div><div className="eyebrow"><UserRound size={15}/> SEU PERFIL E SEUS DADOS</div><h1>Conta <span>👋</span></h1><p>{authUser?'Conta sincronizada com seu e-mail.':'Crie sua conta ou entre para manter seus dados separados.'}</p></div></div><div className="account-grid"><section className="panel account-card"><div className="account-avatar">{profile.avatar?<img src={profile.avatar} alt="Foto do perfil"/>:<UserRound size={25}/>}</div><input ref={photoInput} className="profile-photo-input" type="file" accept="image/*" aria-label="Escolher foto de perfil" onChange={e=>{changePhoto(e.target.files?.[0]);e.currentTarget.value=''}}/><div className="profile-photo-actions"><button type="button" className="photo-action" onClick={()=>photoInput.current?.click()}>{profile.avatar?'Trocar foto':'Adicionar foto'}</button>{profile.avatar&&<button type="button" className="photo-action remove-photo" onClick={removePhoto}>Remover</button>}</div><div className="section-kicker">{authUser?'CONTA CONECTADA':'ACESSO POR E-MAIL'}</div><h2>{authUser?'Seu perfil':'Entrar ou criar conta'}</h2>{authUser?<><p className="account-description">Tarefas, compromissos, post-its, nome e foto são sincronizados nesta conta.</p><label className="account-field">Nome<input value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})} placeholder="Como podemos chamar você?"/></label><label className="account-field">E-mail<input type="email" value={authUser.email??''} readOnly/></label><button className="google-button" onClick={saveProfile}><Check size={17}/>Salvar perfil</button><button className="signout-button" onClick={()=>void onSignOut()}>Sair da conta</button></>:<><p className="account-description">Use um e-mail e uma senha para guardar seus dados na sua própria conta.</p>{!supabase?<div className="setup-notice"><b>Login ainda não conectado ao site</b><p>O projeto está pronto para receber as configurações do Supabase. Depois de cadastrá-las no GitHub, o cadastro será ativado.</p></div>:<form onSubmit={submit}><label className="account-field">E-mail<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@exemplo.com"/></label><label className="account-field">Senha<input type="password" autoComplete={mode==='signup'?'new-password':'current-password'} minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Pelo menos 6 caracteres"/></label><button className="google-button" type="submit" disabled={busy||!authReady}>{busy?'Aguarde…':mode==='signup'?'Criar conta':'Entrar'}</button><button type="button" className="secondary-account-button" onClick={()=>{setMode(mode==='signup'?'login':'signup');setMessage('')}}>{mode==='signup'?'Já tenho uma conta · Entrar':'Criar uma conta nova'}</button></form>}{message&&<p className={`auth-message ${message.includes('incorretos')||message.includes('Já existe uma conta')?'auth-message-error':''}`} role="status">{message}</p>}</>}{authError&&<p className="sync-error" role="status">{authError}</p>}<p className="account-footnote">{authUser?'Nome e foto do perfil são sincronizados na sua conta e podem ser acessados em outros dispositivos.':'Sua foto de perfil, antes do login, fica salva neste navegador.'}</p></section><section className="panel account-card"><div className="account-avatar mail-avatar"><Mail size={24}/></div><div className="section-kicker">PRÓXIMO PASSO</div><h2>Confirmação por e-mail</h2><p className="account-description">Quando você criar a conta, o Supabase enviará um link para confirmar o endereço. Depois, basta entrar com e-mail e senha.</p><p className="account-footnote">O login não envia lembretes automáticos. Os avisos por e-mail das tarefas podem ser configurados em outra etapa.</p></section></div></section>
}


