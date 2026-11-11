import {useMemo,useState} from 'react';
import {LayoutDashboard,ArrowLeftRight,ChartNoAxesCombined,Wallet,ShieldCheck,Search,Download,Filter,ShieldAlert,CheckCircle2,Clock3,Activity,BrainCircuit,Menu,X} from 'lucide-react';
import {CartesianGrid,XAxis,YAxis,Tooltip,ResponsiveContainer,BarChart,Bar} from 'recharts';

type Page='Overview'|'Transactions'|'Analytics';
type Tx={id:string;step:number;type:string;amount:number;status:'Completed'|'Review';};

const TYPES=['PAYMENT','TRANSFER','CASH_OUT','CASH_IN','DEBIT'];
const initial:Tx[]=[
  {id:'TXN-1001',step:120,type:'PAYMENT',amount:250,status:'Completed'},
  {id:'TXN-1002',step:245,type:'TRANSFER',amount:85000,status:'Review'},
  {id:'TXN-1003',step:380,type:'CASH_OUT',amount:120000,status:'Review'},
  {id:'TXN-1004',step:510,type:'CASH_IN',amount:1500,status:'Completed'},
  {id:'TXN-1005',step:640,type:'DEBIT',amount:780,status:'Completed'},
];
const menu=[
  {name:'Overview',icon:LayoutDashboard},
  {name:'Transactions',icon:ArrowLeftRight},
  {name:'Analytics',icon:ChartNoAxesCombined},
] as const;
const descriptions:Record<Page,string>={
  Overview:'Monitor transaction activity and risk insights.',
  Transactions:'Search, filter, and review transaction records.',
  Analytics:'Explore transaction patterns and model readiness.',
};
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);

function saveCSV(rows:Tx[]){
  const csv=['transaction_id,step,type,amount,status',...rows.map(t=>`${t.id},${t.step},${t.type},${t.amount},${t.status}`)].join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='fraudflow-transactions.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function App(){
  const [page,setPage]=useState<Page>('Overview');
  const [search,setSearch]=useState('');
  const [type,setType]=useState('All types');
  const [status,setStatus]=useState('All statuses');
  const [sidebar,setSidebar]=useState(false);

  const filtered=useMemo(()=>initial.filter(t=>
    [t.id,t.type,t.status,String(t.step),String(t.amount)].some(v=>v.toLowerCase().includes(search.toLowerCase()))
    &&(type==='All types'||t.type===type)
    &&(status==='All statuses'||t.status===status)
  ),[search,type,status]);
  const flagged=initial.filter(t=>t.status==='Review').length;
  const total=initial.reduce((a,t)=>a+t.amount,0);
  const choose=(p:Page)=>{setPage(p);setSidebar(false)};

  return <div className="app">
    <aside className={'sidebar '+(sidebar?'show':'')}>
      <div className="brand">
        <span className="brand-icon"><ShieldCheck size={22}/></span>
        <span>Fraud<span className="brand-green">Flow</span><small>INTELLIGENCE PLATFORM</small></span>
        <button className="mobile-close" onClick={()=>setSidebar(false)}><X size={18}/></button>
      </div>
      <div className="nav-caption">WORKSPACE</div>
      <nav>{menu.map(({name,icon:Icon})=><button key={name} className={'nav-item '+(page===name?'active':'')} onClick={()=>choose(name)}><Icon size={19}/>{name}</button>)}</nav>
      <div className="sidebar-bottom"><div className="demo-chip"><span className="dot"/> Demo workspace</div></div>
    </aside>

    <div className="main">
      <header className="topbar">
        <button className="menu-toggle" onClick={()=>setSidebar(true)} aria-label="Open menu"><Menu size={21}/></button>
        <div className="breadcrumbs">Workspace <span>/</span> <strong>{page}</strong></div>
        <div className="top-actions"><span className="demo-label">DEMO DATA</span></div>
      </header>

      <main className="content">
        <div className="page-heading">
          <div><div className="eyebrow">FRAUD INTELLIGENCE</div><h1>{page}</h1><p>{descriptions[page]}</p></div>
          {page==='Transactions'&&<button className="btn outline" onClick={()=>saveCSV(filtered)}><Download size={17}/> Export CSV</button>}
        </div>

        {page==='Overview'&&<>
          <div className="metrics">
            <Metric icon={<ArrowLeftRight/>} label="Total transactions" value={String(initial.length).padStart(2,'0')} hint="Sample dataset"/>
            <Metric icon={<ShieldAlert/>} label="Flagged for review" value={String(flagged).padStart(2,'0')} hint="Demo labels"/>
            <Metric icon={<Activity/>} label="Flagged rate" value={(flagged/initial.length*100).toFixed(1)+'%'} hint="Not model-generated"/>
            <Metric icon={<Wallet/>} label="Total volume" value={money(total)} hint={`Across ${initial.length} records`}/>
          </div>
          <section className="panel">
            <div className="panel-top"><PanelTitle title="Recent transactions" sub="Latest records in your demo workspace"/><button className="link-btn" onClick={()=>choose('Transactions')}>View all →</button></div>
            <TransactionTable rows={initial.slice(0,4)}/>
          </section>
        </>}

        {page==='Transactions'&&<section className="panel">
          <div className="toolbar">
            <div className="search"><Search size={18}/><input aria-label="Search transactions" placeholder="Search ID, type, amount, step, status..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
            <div className="filter"><Filter size={17}/><select aria-label="Filter type" value={type} onChange={e=>setType(e.target.value)}>{['All types',...TYPES].map(t=><option key={t}>{t}</option>)}</select></div>
            <select aria-label="Filter status" className="filter-select" value={status} onChange={e=>setStatus(e.target.value)}>{['All statuses','Completed','Review'].map(s=><option key={s}>{s}</option>)}</select>
          </div>
          <div className="table-meta">Showing {filtered.length} of {initial.length} demo transactions</div>
          <TransactionTable rows={filtered}/>
        </section>}

        {page==='Analytics'&&<>
          <div className="notice"><BrainCircuit size={20}/><div><strong>ML integration is not connected yet</strong><p>These charts use demo transaction records. No fraud probabilities or model performance scores are being claimed.</p></div></div>
          <section className="panel">
            <PanelTitle title="Model performance" sub="Metrics will appear after the trained model is connected"/>
            <div className="placeholder-metrics">{['Precision','Recall','F1 score','Average precision'].map(n=><div key={n}><small>{n}</small><b>—</b><span>Awaiting model results</span></div>)}</div>
          </section>
          <section className="panel">
            <PanelTitle title="Transactions by type" sub="Count by PaySim transaction category"/>
            <div className="chart"><ResponsiveContainer width="100%" height="100%">
              <BarChart data={TYPES.map(type=>({type,count:initial.filter(t=>t.type===type).length}))}>
                <CartesianGrid vertical={false} stroke="#edf2ef"/>
                <XAxis dataKey="type" tick={{fontSize:10,fill:'#7b8e84'}} tickLine={false} axisLine={false}/>
                <YAxis allowDecimals={false} tickLine={false} axisLine={false}/>
                <Tooltip/>
                <Bar dataKey="count" fill="#159568" radius={[5,5,0,0]}/>
              </BarChart>
            </ResponsiveContainer></div>
          </section>
          <section className="panel">
            <PanelTitle title="Fraud detection" sub="API integration planned for a later phase"/>
            <p className="muted">The existing model uses step, type and amount. A live prediction form will be enabled after a trained pipeline and its validation-selected threshold are exported and connected to the backend.</p>
          </section>
        </>}

        <footer>FraudFlow · Prototype v0.1 · All displayed records are synthetic UI examples</footer>
      </main>
    </div>
    {sidebar&&<div className="overlay" onClick={()=>setSidebar(false)}/>}
  </div>;
}

function Metric({icon,label,value,hint}:{icon:React.ReactNode,label:string,value:string,hint:string}){
  return <div className="metric"><div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div><strong>{value}</strong><small>{hint}</small></div>;
}

function PanelTitle({title,sub}:{title:string,sub:string}){
  return <div className="panel-title"><h2>{title}</h2><p>{sub}</p></div>;
}

function TransactionTable({rows}:{rows:Tx[]}){
  return <div className="table-wrap"><table>
    <thead><tr><th>TRANSACTION ID</th><th>TYPE</th><th>STEP</th><th>AMOUNT</th><th>STATUS</th></tr></thead>
    <tbody>{rows.length?rows.map(t=><tr key={t.id}>
      <td className="id">{t.id}</td><td>{t.type}</td><td>{t.step}</td><td className="amount">{money(t.amount)}</td>
      <td><span className={'status '+(t.status==='Completed'?'complete':'review')}>{t.status==='Completed'?<CheckCircle2 size={13}/>:<Clock3 size={13}/>} {t.status}</span></td>
    </tr>):<tr><td colSpan={5} className="no-results">No matching transactions. Try a different search or filter.</td></tr>}</tbody>
  </table></div>;
}
