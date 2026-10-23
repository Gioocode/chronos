import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Bell, CalendarDays, Check, CheckCircle2, ChevronDown, Clock3, MoreHorizontal, Plus, Search, Settings2, Sparkles, StickyNote, Sun, X } from 'lucide-react'
import { initialData, loadData, type Category, type ChronosData, type StickyNote as Note, type Task } from './model'

const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const monthNames = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
const categoryName: Record<Category,string> = { trabalho:'Trabalho', pessoal:'Pessoal', estudo:'Estudos', saude:'Saúde' }
const categoryTone: Record<Category,string> = { trabalho:'blue', pessoal:'pink', estudo:'purple', saude:'green' }
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const today = new Date()
const prettyTime = (time: string) => time

function App() {
  const [data, setData] = useState<ChronosData>(() => loadData())
  const [view, setView] = useState<'calendar'|'tasks'|'notes'>('calendar')
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(dateKey(today))
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<'task'|'note'|null>(null)

  const save = (next: ChronosData) => { setData(next); try { localStorage.setItem('chronos:v1', JSON.stringify(next)) } catch { /* storage unavailable */ } }
  const monthDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const mondayOffset = (first.getDay()+6)%7
    return Array.from({length:42},(_,i)=>new Date(month.getFullYear(),month.getMonth(),1-mondayOffset+i))
  },[month])
  const categoryFilter = (['trabalho','pessoal','estudo','saude'] as string[]).includes(query) ? query : ''
  const textFilter = categoryFilter ? '' : query.trim().toLocaleLowerCase('pt-BR')
  const todaysTasks = data.tasks.filter(t=>t.date===selected&&(!categoryFilter||t.category===categoryFilter)&&(!textFilter||t.title.toLocaleLowerCase('pt-BR').includes(textFilter))).sort((a,b)=>a.time.localeCompare(b.time))
  const events = [
    ...data.appointments.filter(a=>a.date===selected).map(a=>({id:a.id,title:a.title,time:a.time,end:a.endTime,kind:'appointment' as const, category:a.category, place:a.place})),
    ...data.tasks.filter(t=>t.date===selected).map(t=>({id:t.id,title:t.title,time:t.time,end:'',kind:'task' as const,category:t.category,done:t.done})),
  ].sort((a,b)=>a.time.localeCompare(b.time))
  const doneCount = todaysTasks.filter(t=>t.done).length

  const toggleTask = (id: string) => save({...data,tasks:data.tasks.map(t=>t.id===id?{...t,done:!t.done}:t)})
  const addTask = (title: string, time: string, category: Category) => { const task: Task={id:crypto.randomUUID(),title,time,date:selected,category,done:false}; save({...data,tasks:[...data.tasks,task]}); setModal(null) }
  const addNote = (title: string, content: string) => { const note: Note={id:crypto.randomUUID(),title,content,color:'yellow',updatedAt:new Date().toISOString()}; save({...data,notes:[note,...data.notes]}); setModal(null) }
  const updateNote = (id:string, patch:Partial<Note>) => save({...data,notes:data.notes.map(n=>n.id===id?{...n,...patch,updatedAt:new Date().toISOString()}:n)})
  const removeNote = (id:string) => save({...data,notes:data.notes.filter(n=>n.id!==id)})
  const headingDate = new Date(`${selected}T12:00:00`)

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={e=>e.preventDefault()}><span className="brand-mark"><Clock3 size={22}/></span><span>chronos<span className="brand-period">.</span></span></a>
      <button className="new-button" onClick={()=>setModal('task')}><Plus size={18}/> Nova tarefa</button>
      <div className="nav-label">MENU</div>
      <nav className="main-nav">
        <button className={view==='calendar'?'active':''} onClick={()=>setView('calendar')}><CalendarDays size={18}/> Calendário</button>
        <button className={view==='tasks'?'active':''} onClick={()=>setView('tasks')}><CheckCircle2 size={18}/> Minhas tarefas <span className="nav-count">{data.tasks.filter(t=>!t.done).length}</span></button>
        <button className={view==='notes'?'active':''} onClick={()=>setView('notes')}><StickyNote size={18}/> Post-its</button>
      </nav>
      <div className="side-divider"/>
      <div className="nav-label category-label">CATEGORIAS <button title="Gerenciar categorias"><Plus size={15}/></button></div>
      <div className="category-list">{(['trabalho','pessoal','estudo','saude'] as Category[]).map(c=><button key={c} onClick={()=>setQuery(query===c?'':c)} className={query===c?'filtered':''}><span className={`dot ${categoryTone[c]}`}/>{categoryName[c]}<span className="category-total">{data.tasks.filter(t=>t.category===c&&!t.done).length}</span></button>)}</div>
      <div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={16}/></div><b>Seu tempo, com intenção.</b><p>Pequenos passos todos os dias fazem a diferença.</p></div><button className="profile"><span className="avatar">M</span><span><b>Mariana Costa</b><small>Meu espaço</small></span><MoreHorizontal size={18}/></button></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">Meu espaço <span>/</span> <b>{view==='calendar'?'Calendário':view==='tasks'?'Minhas tarefas':'Post-its'}</b></div><div className="top-actions"><label className="search-box"><Search size={17}/><input placeholder="Buscar tarefa..." value={query&&!(['trabalho','pessoal','estudo','saude'] as string[]).includes(query)?query:''} onChange={e=>setQuery(e.target.value)}/><kbd>⌘ K</kbd></label><button className="icon-button notification" aria-label="Notificações"><Bell size={18}/><i/></button><button className="icon-button" aria-label="Configurações"><Settings2 size={18}/></button></div></header>

      {view==='calendar'&&<>
        <section className="welcome-row"><div><div className="eyebrow"><Sun size={15}/> UMA NOVA CHANCE DE FAZER ACONTECER</div><h1>Bom dia, Mariana <span>☀️</span></h1><p>Um passo de cada vez. Você está indo muito bem.</p></div><button className="today-button" onClick={()=>{setMonth(new Date(today.getFullYear(),today.getMonth(),1));setSelected(dateKey(today))}}>Hoje <ArrowRight size={15}/></button></section>
        <div className="dashboard-grid">
          <section className="panel calendar-panel"><div className="panel-head"><div><h2>{monthNames[month.getMonth()]} <span>{month.getFullYear()}</span></h2><p>Seu mês, no seu ritmo</p></div><div className="month-actions"><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))} aria-label="Mês anterior"><ArrowLeft size={16}/></button><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))} aria-label="Próximo mês"><ArrowRight size={16}/></button><button className="view-select">Mês <ChevronDown size={14}/></button></div></div>
            <div className="calendar-grid weekday-row">{weekdays.map(d=><div key={d}>{d}</div>)}</div><div className="calendar-grid date-grid">{monthDays.map((d,i)=>{const key=dateKey(d),isToday=key===dateKey(today),hasItems=data.tasks.some(t=>t.date===key)||data.appointments.some(a=>a.date===key);return <button key={i} onClick={()=>setSelected(key)} className={`date-cell ${d.getMonth()!==month.getMonth()?'muted':''} ${key===selected?'selected':''} ${isToday?'today':''}`}><span>{d.getDate()}</span>{hasItems&&<i/>}</button>})}</div>
            <div className="calendar-footer"><span><i className="legend-dot task-dot"/> Tarefas</span><span><i className="legend-dot event-dot"/> Compromissos</span><span><i className="legend-dot note-dot"/> Post-its</span></div>
          </section>

          <section className="panel day-panel"><div className="panel-head day-head"><div><div className="section-kicker">SUA AGENDA</div><h2>{headingDate.toLocaleDateString('pt-BR',{day:'2-digit',month:'long'})}<span className="year-inline">, {headingDate.getFullYear()}</span></h2><p>{events.length?`${events.length} momentos no seu dia`:'Um dia aberto para novas possibilidades'}</p></div><button className="add-small" onClick={()=>setModal('task')} title="Adicionar tarefa"><Plus size={18}/></button></div>
            {events.length?<div className="timeline">{events.slice(0,5).map((e,i)=><div className={`timeline-item ${i===0?'first':''}`} key={`${e.kind}-${e.id}`}><div className="time-label">{prettyTime(e.time)}</div><div className={`timeline-line ${i===events.length-1?'last':''}`}><i className={`timeline-dot ${categoryTone[e.category]}`}/></div><div className={`event-card ${e.kind==='task'?'task-card':''} ${e.category}`}><div className="event-meta"><span className={`event-chip ${categoryTone[e.category]}`}>{e.kind==='task'?'Tarefa':categoryName[e.category]}</span>{e.end&&<span className="event-duration">{e.time} – {e.end}</span>}</div><b>{e.title}</b>{e.kind==='appointment'&&e.place&&<small>{e.place}</small>}{e.kind==='task'&&<button className={`event-check ${e.done?'checked':''}`} onClick={()=>toggleTask(e.id)} aria-label={e.done?'Reabrir tarefa':'Concluir tarefa'}>{e.done&&<Check size={12}/>}</button>}</div></div>)}</div>:<div className="empty-day"><div className="empty-sun">☀</div><b>Seu dia está livre</b><p>Que tal reservar um tempo para você?</p><button onClick={()=>setModal('task')}><Plus size={15}/> Adicionar tarefa</button></div>}
            <button className="see-day" onClick={()=>setView('tasks')}>Ver todas as tarefas <ArrowRight size={15}/></button>
          </section>

          <section className="panel tasks-panel"><div className="panel-head compact-head"><div><div className="section-kicker">FOCO DE HOJE</div><h2>Suas tarefas</h2></div><button className="text-action" onClick={()=>setView('tasks')}>Ver todas <ArrowRight size={14}/></button></div><div className="progress-row"><div className="progress-track"><span style={{width:`${todaysTasks.length?doneCount/todaysTasks.length*100:0}%`}}/></div><span>{doneCount} de {todaysTasks.length} concluídas</span></div>
            <div className="task-list">{todaysTasks.slice(0,4).map(t=><TaskRow key={t.id} task={t} onToggle={()=>toggleTask(t.id)}/>)}{!todaysTasks.length&&<p className="no-tasks">Nenhuma tarefa por aqui. Aproveite o espaço. 🌿</p>}</div><button className="add-task-row" onClick={()=>setModal('task')}><Plus size={16}/> Adicionar tarefa</button>
          </section>

          <section className="panel notes-panel"><div className="panel-head compact-head"><div><div className="section-kicker">PENSE EM VOZ ALTA</div><h2>Seus post-its</h2></div><button className="icon-button mini" onClick={()=>setModal('note')} aria-label="Novo post-it"><Plus size={17}/></button></div><div className="note-preview-list">{data.notes.slice(0,2).map(n=><button key={n.id} className={`note-preview ${n.color}`} onClick={()=>setView('notes')}><span className="note-pin"/><b>{n.title}</b><p>{n.content.split('\n')[0]}</p></button>)}{!data.notes.length&&<p className="no-tasks">Suas ideias começam aqui.</p>}</div><button className="add-task-row note-add" onClick={()=>setModal('note')}><Plus size={16}/> Criar post-it</button></section>
        </div>
        <footer className="quote-footer"><span>“</span><p>Não é sobre ter tempo. É sobre fazer escolhas.</p><small>— Seu lembrete de hoje</small></footer>
      </>}

      {view==='tasks'&&<section className="full-view"><div className="welcome-row"><div><div className="eyebrow"><CheckCircle2 size={15}/> UM PASSO DE CADA VEZ</div><h1>Minhas tarefas <span>🌱</span></h1><p>Seu progresso, no seu ritmo.</p></div><button className="primary-button" onClick={()=>setModal('task')}><Plus size={16}/> Nova tarefa</button></div><div className="panel full-panel"><div className="panel-head"><div><h2>{headingDate.toLocaleDateString('pt-BR',{day:'2-digit',month:'long'})}</h2><p>{doneCount} de {todaysTasks.length} concluídas</p></div></div>{todaysTasks.map(t=><TaskRow key={t.id} task={t} onToggle={()=>toggleTask(t.id)}/>)}{!todaysTasks.length&&<div className="empty-day"><b>Nenhuma tarefa neste dia</b><button onClick={()=>setModal('task')}><Plus size={15}/> Adicionar tarefa</button></div>}</div></section>}

      {view==='notes'&&<section className="full-view"><div className="welcome-row"><div><div className="eyebrow"><StickyNote size={15}/> IDEIAS QUE MERECEM UM LUGAR</div><h1>Seus post-its <span>💡</span></h1><p>Anotações rápidas, sempre por perto.</p></div><button className="primary-button" onClick={()=>setModal('note')}><Plus size={16}/> Novo post-it</button></div><div className="notes-board">{data.notes.map(n=><NoteCard key={n.id} note={n} onSave={patch=>updateNote(n.id,patch)} onDelete={()=>removeNote(n.id)}/>)}<button className="add-note-card" onClick={()=>setModal('note')}><Plus size={22}/><span>Adicionar um post-it</span></button></div><p className="local-note"><span>●</span> Seus post-its ficam salvos neste dispositivo.</p></section>}
    </main>
    {modal&&<Modal type={modal} onClose={()=>setModal(null)} onAddTask={addTask} onAddNote={addNote}/>}
  </div>
}

function TaskRow({task,onToggle}:{task:Task;onToggle:()=>void}){return <div className={`task-row ${task.done?'is-done':''}`}><button className={`task-check ${task.done?'checked':''}`} onClick={onToggle} aria-label={task.done?'Reabrir tarefa':'Concluir tarefa'}>{task.done&&<Check size={13}/>}</button><span className={`task-color ${categoryTone[task.category]}`}/><span className="task-title">{task.title}</span><span className="task-time"><Clock3 size={13}/>{task.time}</span></div>}
function NoteCard({note,onSave,onDelete}:{note:Note;onSave:(p:Partial<Note>)=>void;onDelete:()=>void}){return <article className={`note-card ${note.color}`}><div className="note-card-head"><span className="note-pin"/><button onClick={onDelete} aria-label="Excluir post-it"><X size={15}/></button></div><input value={note.title} onChange={e=>onSave({title:e.target.value})} aria-label="Título do post-it"/><textarea value={note.content} onChange={e=>onSave({content:e.target.value})} aria-label="Conteúdo do post-it"/><div className="note-card-foot"><small>Salvo neste dispositivo</small><div className="color-choices">{(['yellow','pink','purple','green'] as const).map(c=><button key={c} className={`color-choice ${c} ${note.color===c?'chosen':''}`} onClick={()=>onSave({color:c})} aria-label={`Cor ${c}`}/>)}</div></div></article>}
function Modal({type,onClose,onAddTask,onAddNote}:{type:'task'|'note';onClose:()=>void;onAddTask:(title:string,time:string,category:Category)=>void;onAddNote:(title:string,content:string)=>void}){const [title,setTitle]=useState(''),[time,setTime]=useState('09:00'),[category,setCategory]=useState<Category>('trabalho'),[content,setContent]=useState('');const task=type==='task';return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><form className="modal" onSubmit={e=>{e.preventDefault();if(!title.trim())return;task?onAddTask(title,time,category):onAddNote(title,content)}}><button type="button" className="modal-close" onClick={onClose}><X size={18}/></button><div className="modal-icon">{task?<CheckCircle2 size={20}/>:<StickyNote size={20}/>}</div><div className="section-kicker">UM ESPAÇO PARA VOCÊ</div><h2>{task?'Nova tarefa':'Novo post-it'}</h2><p>{task?'Organize o próximo passo do seu dia.':'Guarde uma ideia antes que ela escape.'}</p><label>Título<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder={task?'Ex.: Preparar apresentação':'Ex.: Uma ideia importante'} required/></label>{task?<div className="form-grid"><label>Horário<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label><label>Categoria<select value={category} onChange={e=>setCategory(e.target.value as Category)}>{(Object.keys(categoryName) as Category[]).map(c=><option key={c} value={c}>{categoryName[c]}</option>)}</select></label></div>:<label>Anotação<textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Escreva aqui..." rows={4}/></label>}<div className="modal-actions"><button type="button" className="cancel-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button"><Plus size={16}/>{task?'Adicionar tarefa':'Criar post-it'}</button></div></form></div>}
