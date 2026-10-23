import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Bell, CalendarDays, Check, CheckCircle2, Clock3, Mail, MoreHorizontal, Plus, Search, Settings2, Sparkles, StickyNote, Sun, UserRound, X } from 'lucide-react'
import { loadData, type Category, type ChronosData, type StickyNote as Note, type Task } from './model'

const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const monthNames = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
const builtInCategories: Category[] = ['trabalho','pessoal','estudo','saude']
const categoryName: Record<string,string> = { trabalho:'Trabalho', pessoal:'Pessoal', estudo:'Estudos', saude:'Saúde' }
const categoryTone: Record<string,string> = { trabalho:'blue', pessoal:'pink', estudo:'purple', saude:'green' }
const getCategoryName = (category:Category) => categoryName[category] ?? category
const getCategoryTone = (category:Category) => categoryTone[category] ?? 'blue'
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
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
  const [view, setView] = useState<'calendar'|'space'>('calendar')
  const [spaceTab, setSpaceTab] = useState<'account'|'tasks'|'notes'>('account')
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(dateKey(today))
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<'task'|'note'|null>(null)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [calendarMode, setCalendarMode] = useState<'day'|'month'|'year'>('month')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showReminderSettings, setShowReminderSettings] = useState(false)
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours())
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
    const timer = window.setInterval(() => setCurrentHour(new Date().getHours()),60_000)
    return () => window.clearInterval(timer)
  },[])

  const save = (next: ChronosData) => { setData(next); try { localStorage.setItem('chronos:v1', JSON.stringify(next)) } catch { /* storage unavailable */ } }
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
  ].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)).slice(0,8)

  const toggleTask = (id: string) => save({...data,tasks:data.tasks.map(t=>t.id===id?{...t,done:!t.done}:t)})
  const addTask = (title: string, date: string, time: string, category: Category) => { const task: Task={id:crypto.randomUUID(),title,time,date,category,done:false}; save({...data,tasks:[...data.tasks,task]}); setSelected(date); setMonth(new Date(`${date}T12:00:00`)); setModal(null) }
  const addNote = (title: string, content: string, date: string, endDate: string) => { const note: Note={id:crypto.randomUUID(),title,content,date,endDate,color:'yellow',updatedAt:new Date().toISOString()}; save({...data,notes:[note,...data.notes]}); setSelected(date); setMonth(new Date(`${date}T12:00:00`)); setModal(null) }
  const updateNote = (id:string, patch:Partial<Note>) => save({...data,notes:data.notes.map(n=>n.id===id?{...n,...patch,updatedAt:new Date().toISOString()}:n)})
  const removeNote = (id:string) => save({...data,notes:data.notes.filter(n=>n.id!==id)})
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
  const saveProfile = () => { try { localStorage.setItem('chronos:profile:v1',JSON.stringify(profile)) } catch { /* storage unavailable */ } }
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
        setProfile(next)
        try { localStorage.setItem('chronos:profile:v1',JSON.stringify(next)) } catch { /* storage unavailable */ }
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  }
  const removeProfilePhoto = () => {
    const next = {...profile,avatar:undefined}
    setProfile(next)
    try { localStorage.setItem('chronos:profile:v1',JSON.stringify(next)) } catch { /* storage unavailable */ }
  }
  const saveReminderSettings = (next:{enabled:boolean;timing:string}) => {
    setReminderSettings(next)
    localStorage.setItem('chronos:reminders:v1',JSON.stringify(next))
  }
  const headingDate = new Date(`${selected}T12:00:00`)
  const greeting = currentHour < 12 ? 'Bom dia' : currentHour < 18 ? 'Boa tarde' : 'Boa noite'
  const greetingEmoji = currentHour < 12 ? '☀️' : currentHour < 18 ? '🌤️' : '🌙'
  const openSpace = (tab:'account'|'tasks'|'notes'='account') => { setSpaceTab(tab); setView('space') }

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
      <header className="topbar"><div className="breadcrumb">{view==='calendar'?'Início':'Meu espaço'} <span>/</span> <b>{view==='calendar'?'Calendário':spaceTab==='account'?'Conta':spaceTab==='tasks'?'Tarefas':'Post-it'}</b></div><div className="top-actions"><label className="search-box"><Search size={17}/><input ref={searchRef} placeholder="Buscar tarefa..." value={query&&!allCategories.includes(query)?query:''} onChange={e=>setQuery(e.target.value)} aria-label="Buscar tarefas e compromissos"/><kbd>Ctrl K</kbd></label><div className="notification-wrap"><button className="icon-button notification" aria-label={`Notificações${notifications.length?`, ${notifications.length} próximas`:''}`} title="Notificações" aria-expanded={showNotifications} onClick={()=>setShowNotifications(value=>!value)}><Bell size={18}/>{notifications.length>0&&<span className="notification-count">{notifications.length>9?'9+':notifications.length}</span>}</button>{showNotifications&&<section className="notification-popover" aria-label="Notificações"><div className="notification-popover-head"><div><b>Notificações</b><small>Próximos 7 dias</small></div><button onClick={()=>setShowNotifications(false)} aria-label="Fechar notificações"><X size={15}/></button></div>{notifications.length?<div className="notification-list">{notifications.map(item=><button key={`${item.kind}-${item.id}`} className="notification-item" onClick={()=>{setSelected(item.date);setMonth(new Date(`${item.date}T12:00:00`));setView('calendar');setShowNotifications(false)}}><span className={`dot ${getCategoryTone(item.category)}`}/><span className="notification-item-copy"><b>{item.title}</b><small>{item.kind} · {item.date===todayKey?'Hoje':new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})} às {item.time}</small></span><ArrowRight size={14}/></button>)}</div>:<div className="notification-empty"><Bell size={19}/><b>Tudo em dia</b><span>Suas tarefas e compromissos futuros aparecerão aqui.</span></div>}</section>}</div><button className="icon-button" aria-label="Conta" title="Conta" onClick={()=>openSpace('account')}><Settings2 size={18}/></button></div></header>

      {view==='space'&&<nav className="space-tabs" aria-label="Meu espaço"><button className={spaceTab==='account'?'selected':''} aria-current={spaceTab==='account'?'page':undefined} onClick={()=>setSpaceTab('account')}><UserRound size={16}/> Conta</button><button className={spaceTab==='tasks'?'selected':''} aria-current={spaceTab==='tasks'?'page':undefined} onClick={()=>setSpaceTab('tasks')}><CheckCircle2 size={16}/> Tarefas <span>{data.tasks.filter(task=>!task.done).length}</span></button><button className={spaceTab==='notes'?'selected':''} aria-current={spaceTab==='notes'?'page':undefined} onClick={()=>setSpaceTab('notes')}><StickyNote size={16}/> Post-it</button></nav>}

      {view==='calendar'&&<>
        <section className="welcome-row"><div><div className="eyebrow"><Sun size={15}/> UMA NOVA CHANCE DE FAZER ACONTECER</div><h1>{greeting}{profile.name&&profile.name!=='Meu nome'?`, ${profile.name.split(' ')[0]}`:''} <span>{greetingEmoji}</span></h1><p>Um passo de cada vez. Você está indo muito bem.</p></div><button className="today-button" onClick={()=>{setMonth(new Date(today.getFullYear(),today.getMonth(),1));setSelected(dateKey(today))}}>Hoje <ArrowRight size={15}/></button></section>
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

      {view==='space'&&spaceTab==='account'&&<section className="full-view"><div className="welcome-row"><div><div className="eyebrow"><UserRound size={15}/> SEU PERFIL E SEUS DADOS</div><h1>Conta <span>👋</span></h1><p>Gerencie seu perfil neste dispositivo.</p></div></div><div className="account-grid"><section className="panel account-card"><div className="account-avatar">{profile.avatar?<img src={profile.avatar} alt="Foto do perfil"/>:<UserRound size={25}/>}</div><input ref={profilePhotoInput} className="profile-photo-input" type="file" accept="image/*" aria-label="Escolher foto de perfil" onChange={e=>{changeProfilePhoto(e.target.files?.[0]);e.currentTarget.value=''}}/><div className="profile-photo-actions"><button type="button" className="photo-action" onClick={()=>profilePhotoInput.current?.click()}>{profile.avatar?'Trocar foto':'Adicionar foto'}</button>{profile.avatar&&<button type="button" className="photo-action remove-photo" onClick={removeProfilePhoto}>Remover</button>}</div><div className="section-kicker">PERFIL</div><h2>Perfil neste navegador</h2><p className="account-description">Seu perfil, tarefas e post-its ficam salvos neste dispositivo.</p><label className="account-field">Nome<input value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})} placeholder="Como podemos chamar você?"/></label><label className="account-field">E-mail<input type="email" value={profile.email} onChange={e=>setProfile({...profile,email:e.target.value})} placeholder="voce@exemplo.com"/></label><button className="google-button" onClick={saveProfile}><Check size={17}/>Salvar perfil</button><p className="account-footnote">A conta online e a sincronização entre dispositivos serão adicionadas depois.</p></section><section className="panel account-card notification-card"><div className="account-avatar mail-avatar"><Mail size={24}/></div><div className="section-kicker">LEMBRETES</div><h2>Avisos por e-mail</h2><p className="account-description">Receba lembretes das tarefas que você cadastrar no Chronos.</p><button className="secondary-account-button" onClick={()=>setShowReminderSettings(v=>!v)}><Bell size={16}/>{showReminderSettings?'Fechar avisos':'Configurar avisos'}</button><p className="account-footnote">O envio automático exige um provedor SMTP/e-mail e uma rotina agendada no backend.</p></section></div>{showReminderSettings&&<ReminderSettingsPanel settings={reminderSettings} onSave={saveReminderSettings}/>}</section>}

      {view==='space'&&spaceTab==='tasks'&&<section className="full-view"><div className="welcome-row"><div><div className="eyebrow"><CheckCircle2 size={15}/> UM PASSO DE CADA VEZ</div><h1>Minhas tarefas <span>🌱</span></h1><p>Seu progresso, no seu ritmo.</p></div><button className="primary-button" onClick={()=>setModal('task')}><Plus size={16}/> Nova tarefa</button></div><div className="panel full-panel"><div className="panel-head"><div><h2>{headingDate.toLocaleDateString('pt-BR',{day:'2-digit',month:'long'})}</h2><p>{doneCount} de {todaysTasks.length} concluídas</p></div><button className="text-action" onClick={()=>setShowCategoryManager(true)}>Gerenciar categorias <Settings2 size={14}/></button></div><div className="task-category-filters"><button className={!categoryFilter?'selected-filter':''} onClick={()=>setQuery('')}>Todas</button>{allCategories.map(category=><button key={category} className={categoryFilter===category?'selected-filter':''} onClick={()=>setQuery(category)}><span className={`dot ${getCategoryTone(category)}`}/>{getCategoryName(category)}</button>)}</div>{todaysTasks.map(t=><TaskRow key={t.id} task={t} onToggle={()=>toggleTask(t.id)}/>)}{!todaysTasks.length&&<div className="empty-day"><b>Nenhuma tarefa neste dia</b><button onClick={()=>setModal('task')}><Plus size={15}/> Adicionar tarefa</button></div>}</div></section>}

      {view==='space'&&spaceTab==='notes'&&<section className="full-view"><div className="welcome-row"><div><div className="eyebrow"><StickyNote size={15}/> IDEIAS QUE MERECEM UM LUGAR</div><h1>Seus post-its <span>💡</span></h1><p>Anotações rápidas, organizadas por data.</p></div><button className="primary-button" onClick={()=>setModal('note')}><Plus size={16}/> Novo post-it</button></div><p className="notes-date-heading">{headingDate.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})} · {data.notes.filter(n=>noteCoversDate(n,selected)).length} post-it(s)</p><div className="notes-board">{data.notes.filter(n=>noteCoversDate(n,selected)).map(n=><NoteCard key={n.id} note={n} onSave={patch=>updateNote(n.id,patch)} onDelete={()=>removeNote(n.id)}/>)}<button className="add-note-card" onClick={()=>setModal('note')}><Plus size={22}/><span>Adicionar um post-it nesta data</span></button></div><p className="local-note"><span>●</span> Selecione uma data no calendário para ver os post-its ativos naquele dia. As datas inicial e final definem o período da nota.</p></section>}
    </main>
    {modal&&<Modal type={modal} categories={allCategories} selectedDate={selected} onClose={()=>setModal(null)} onAddTask={addTask} onAddNote={addNote}/>}
    {showCategoryManager&&<CategoryManager categories={allCategories} customCategories={customCategories} onClose={()=>setShowCategoryManager(false)} onAdd={addCategory} onRemove={removeCategory}/>}
  </div>
}

export default App

function TaskRow({task,onToggle}:{task:Task;onToggle:()=>void}){return <div className={`task-row ${task.done?'is-done':''}`}><button className={`task-check ${task.done?'checked':''}`} onClick={onToggle} aria-label={task.done?'Reabrir tarefa':'Concluir tarefa'}>{task.done&&<Check size={13}/>}</button><span className={`task-color ${getCategoryTone(task.category)}`}/><span className="task-title">{task.title}</span><span className="task-time"><Clock3 size={13}/>{task.time}</span></div>}
function NoteCard({note,onSave,onDelete}:{note:Note;onSave:(p:Partial<Note>)=>void;onDelete:()=>void}){return <article className={`note-card ${note.color}`}><div className="note-card-head"><span className="note-pin"/><button onClick={onDelete} aria-label="Excluir post-it"><X size={15}/></button></div><input value={note.title} onChange={e=>onSave({title:e.target.value})} aria-label="Título do post-it"/><textarea value={note.content} onChange={e=>onSave({content:e.target.value})} aria-label="Conteúdo do post-it"/><div className="note-period-fields"><label>De<input type="date" value={note.date} onChange={e=>onSave({date:e.target.value,endDate:(note.endDate??note.date)<e.target.value?e.target.value:note.endDate})}/></label><label>Até<input type="date" min={note.date} value={note.endDate??note.date} onChange={e=>onSave({endDate:e.target.value})}/></label></div><div className="note-card-foot"><small>{note.date===note.endDate||!note.endDate?new Date(`${note.date}T12:00:00`).toLocaleDateString('pt-BR'):`${new Date(`${note.date}T12:00:00`).toLocaleDateString('pt-BR')} – ${new Date(`${note.endDate}T12:00:00`).toLocaleDateString('pt-BR')}`}</small><div className="color-choices">{(['yellow','pink','purple','green'] as const).map(c=><button key={c} className={`color-choice ${c} ${note.color===c?'chosen':''}`} onClick={()=>onSave({color:c})} aria-label={`Cor ${c}`}/>)}</div></div></article>}
function Modal({type,categories,selectedDate,onClose,onAddTask,onAddNote}:{type:'task'|'note';categories:Category[];selectedDate:string;onClose:()=>void;onAddTask:(title:string,date:string,time:string,category:Category)=>void;onAddNote:(title:string,content:string,date:string,endDate:string)=>void}){const [title,setTitle]=useState(''),[date,setDate]=useState(selectedDate),[endDate,setEndDate]=useState(selectedDate),[time,setTime]=useState('09:00'),[category,setCategory]=useState<Category>('trabalho'),[content,setContent]=useState('');const task=type==='task';return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><form className="modal" onSubmit={e=>{e.preventDefault();if(!title.trim()||(!task&&endDate<date))return;task?onAddTask(title,date,time,category):onAddNote(title,content,date,endDate)}}><button type="button" className="modal-close" onClick={onClose} aria-label="Fechar"><X size={18}/></button><div className="modal-icon">{task?<CheckCircle2 size={20}/>:<StickyNote size={20}/>}</div><div className="section-kicker">UM ESPAÇO PARA VOCÊ</div><h2>{task?'Nova tarefa':'Novo post-it'}</h2><p>{task?'Organize o próximo passo do seu dia.':'Guarde uma ideia e escolha em quais dias ela deve aparecer.'}</p><label>Título<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder={task?'Ex.: Preparar apresentação':'Ex.: Uma ideia importante'} required/></label>{task?<><div className="form-grid"><label>Dia<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label><label>Horário<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div><label>Categoria<select value={category} onChange={e=>setCategory(e.target.value as Category)}>{categories.map(c=><option key={c} value={c}>{getCategoryName(c)}</option>)}</select></label></>:<><label>Anotação<textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Escreva aqui..." rows={4}/></label><div className="form-grid"><label>Data inicial<input type="date" value={date} onChange={e=>{setDate(e.target.value);if(endDate<e.target.value)setEndDate(e.target.value)}} required/></label><label>Data final<input type="date" min={date} value={endDate} onChange={e=>setEndDate(e.target.value)} required/></label></div></>}<div className="modal-actions"><button type="button" className="cancel-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button"><Plus size={16}/>{task?'Adicionar tarefa':'Criar post-it'}</button></div></form></div>}

function CategoryManager({categories,customCategories,onClose,onAdd,onRemove}:{categories:Category[];customCategories:string[];onClose:()=>void;onAdd:(name:string)=>boolean|undefined;onRemove:(name:string)=>void}){const [name,setName]=useState(''),[error,setError]=useState('');return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><form className="modal category-modal" onSubmit={e=>{e.preventDefault();const added=onAdd(name);if(added){setName('');setError('Categoria adicionada.')}else setError('Digite um nome novo para a categoria.')}}><button type="button" className="modal-close" onClick={onClose} aria-label="Fechar"><X size={18}/></button><div className="modal-icon"><Settings2 size={20}/></div><div className="section-kicker">ORGANIZE SEU ESPAÇO</div><h2>Gerenciar categorias</h2><p>As categorias ajudam a filtrar as tarefas.</p><label>Nova categoria<input autoFocus value={name} onChange={e=>{setName(e.target.value);setError('')}} placeholder="Ex.: Família" maxLength={24}/></label><button className="primary-button category-add-button" type="submit"><Plus size={16}/>Adicionar categoria</button>{error&&<p className="category-feedback" role="status">{error}</p>}<div className="managed-categories">{categories.map(category=><div className="managed-category" key={category}><span className={`dot ${getCategoryTone(category)}`}/><span>{getCategoryName(category)}</span>{customCategories.includes(category)&&<button type="button" onClick={()=>onRemove(category)} aria-label={`Excluir categoria ${category}`}><X size={14}/></button>}</div>)}</div><div className="modal-actions"><button type="button" className="cancel-button" onClick={onClose}>Concluir</button></div></form></div>}

function ReminderSettingsPanel({settings,onSave}:{settings:{enabled:boolean;timing:string};onSave:(next:{enabled:boolean;timing:string})=>void}){return <section className="panel reminder-settings"><div><div className="section-kicker">PREFERÊNCIA SALVA NESTE DISPOSITIVO</div><h2>Quando lembrar você?</h2><p>Escolha se gostaria de receber um aviso antes das tarefas.</p></div><label className="reminder-toggle"><input type="checkbox" checked={settings.enabled} onChange={e=>onSave({...settings,enabled:e.target.checked})}/><span>Quero receber lembretes</span></label><label className="account-field reminder-timing">Antecedência<select value={settings.timing} onChange={e=>onSave({...settings,timing:e.target.value})}><option value="on-time">No horário da tarefa</option><option value="30-min">30 minutos antes</option><option value="1-day">Um dia antes</option></select></label><p className="account-footnote">A preferência está guardada. O envio por e-mail será ativado quando conectarmos o serviço de e-mail e o agendamento do Chronos.</p></section>}
