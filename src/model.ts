export type Category = 'trabalho' | 'pessoal' | 'estudo' | 'saude' | (string & {})
export type Task = { id: string; title: string; date: string; time: string; category: Category; done: boolean }
export type Appointment = { id: string; title: string; date: string; time: string; endTime: string; category: Category; place?: string }
export type StickyNote = { id: string; title: string; content: string; date: string; color: 'yellow' | 'pink' | 'purple' | 'green'; updatedAt: string }
export type ChronosData = { tasks: Task[]; appointments: Appointment[]; notes: StickyNote[]; customCategories?: string[] }
export const emptyData: ChronosData = { tasks: [], appointments: [], notes: [], customCategories: [] }

const today = new Date()
const day = (offset: number) => { const d = new Date(today); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
export const initialData: ChronosData = {
  customCategories: [],
  tasks: [
    { id:'t1', title:'Revisar proposta do projeto', date:day(0), time:'09:30', category:'trabalho', done:false },
    { id:'t2', title:'Enviar documentos para a equipe', date:day(0), time:'11:00', category:'trabalho', done:false },
    { id:'t3', title:'Pausa para o almoço', date:day(0), time:'12:30', category:'pessoal', done:true },
    { id:'t4', title:'Ler capítulo do livro', date:day(0), time:'15:00', category:'estudo', done:false },
    { id:'t5', title:'Caminhada no parque', date:day(0), time:'17:30', category:'saude', done:false },
    { id:'t6', title:'Planejar a semana', date:day(1), time:'10:00', category:'pessoal', done:false },
  ],
  appointments: [
    { id:'a1', title:'Daily com o time', date:day(0), time:'10:00', endTime:'10:30', category:'trabalho', place:'Google Meet' },
    { id:'a2', title:'Consulta com a Dra. Marina', date:day(0), time:'14:00', endTime:'14:45', category:'saude', place:'Clínica Vida' },
    { id:'a3', title:'Café com a Ana', date:day(0), time:'16:00', endTime:'17:00', category:'pessoal', place:'Café Aurora' },
    { id:'a4', title:'Revisão de planejamento', date:day(2), time:'11:00', endTime:'12:00', category:'trabalho' },
  ],
  notes: [
    { id:'n1', title:'Ideias para o projeto', content:'• Simplificar a tela inicial\n• Pensar em um novo fluxo para lembretes\n• Compartilhar com o time na sexta', date:day(0), color:'yellow', updatedAt:new Date().toISOString() },
    { id:'n2', title:'Lembrete', content:'Comprar um presente para a mamãe 💛', date:day(1), color:'pink', updatedAt:new Date().toISOString() },
  ],
}

export function loadData(): ChronosData {
  try {
    const saved = localStorage.getItem('chronos:v1')
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<ChronosData>
      return {
        ...initialData,
        ...parsed,
        notes: (parsed.notes ?? initialData.notes).map(note => ({ ...note, date: note.date ?? day(0) })),
      }
    }
  } catch { /* corrupted or unavailable storage falls back to the starter data */ }
  return initialData
}
