import {useEffect,useState} from 'react';
import {LayoutDashboard,ArrowLeftRight,ChartNoAxesCombined,Wallet,ShieldCheck,Search,Download,Filter,ShieldAlert,CheckCircle2,Clock3,Activity,BrainCircuit,Menu,X,ChevronLeft,ChevronRight,AlertTriangle} from 'lucide-react';
import {CartesianGrid,XAxis,YAxis,Tooltip,ResponsiveContainer,BarChart,Bar,Legend} from 'recharts';
import {api,TYPES,type Metrics,type Prediction,type Summary,type Tx,type TxQuery,type TxType} from './api';

type Page='Overview'|'Transactions'|'Analytics';
const PAGE_SIZE=25;
const menu=[
  {name:'Overview',icon:LayoutDashboard},
  {name:'Transactions',icon:ArrowLeftRight},
  {name:'Analytics',icon:ChartNoAxesCombined},
] as const;
const descriptions:Record<Page,string>={
  Overview:'Model risk overview for the PaySim test period.',
  Transactions:'Search, filter, and review scored transactions.',
  Analytics:'Model performance and live fraud checks.',
};
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const compactMoney=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:1}).format(n);
const count=(n:number)=>new Intl.NumberFormat('en-US').format(n);
const pct=(n:number,digits=1)=>{
  const min=10**-digits;
  if(n>0&&n*100<min) return `<${min}%`;
  if(n<1&&n*100>100-min) return `>${(100-min).toFixed(digits)}%`;
  return (n*100).toFixed(digits)+'%';
};

export default function App(){
  const [page,setPage]=useState<Page>('Overview');
  const [sidebar,setSidebar]=useState(false);
  const [summary,setSummary]=useState<Summary|null>(null);
  const [metrics,setMetrics]=useState<Metrics|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [reload,setReload]=useState(0);

  useEffect(()=>{
    setError(null);
    Promise.all([api.summary(),api.metrics()])
      .then(([s,m])=>{setSummary(s);setMetrics(m)})
      .catch(e=>setError(String(e.message??e)));
  },[reload]);

  const choose=(p:Page)=>{setPage(p);setSidebar(false)};
  const connected=!!summary&&!error;

  return <div className="app">
    <aside className={'sidebar '+(sidebar?'show':'')}>
      <div className="brand">
        <span className="brand-icon"><ShieldCheck size={22}/></span>
        <span>Fraud<span className="brand-green">Flow</span><small>INTELLIGENCE PLATFORM</small></span>
        <button className="mobile-close" onClick={()=>setSidebar(false)}><X size={18}/></button>
      </div>
      <div className="nav-caption">WORKSPACE</div>
      <nav>{menu.map(({name,icon:Icon})=><button key={name} className={'nav-item '+(page===name?'active':'')} onClick={()=>choose(name)}><Icon size={19}/>{name}</button>)}</nav>
      <div className="sidebar-bottom"><div className={'demo-chip '+(connected?'':'offline')}><span className="dot"/> {connected?'Model connected':error?'API offline':'Connecting…'}</div></div>
    </aside>

    <div className="main">
      <header className="topbar">
        <button className="menu-toggle" onClick={()=>setSidebar(true)} aria-label="Open menu"><Menu size={21}/></button>
        <div className="breadcrumbs">Workspace <span>/</span> <strong>{page}</strong></div>
        <div className="top-actions">{summary&&<span className="demo-label">TEST SET · STEPS {summary.step_range[0]}–{summary.step_range[1]}</span>}</div>
      </header>

      <main className="content">
        {error?<ApiError page={page} message={error} onRetry={()=>setReload(r=>r+1)}/>:<>
          {page==='Overview'&&<Overview summary={summary} onViewAll={()=>choose('Transactions')}/>}
          {page==='Transactions'&&<Transactions/>}
          {page==='Analytics'&&<Analytics summary={summary} metrics={metrics}/>}
        </>}
        <footer>FraudFlow · Prototype v0.2 · Synthetic PaySim transactions scored by the trained logistic regression model</footer>
      </main>
    </div>
    {sidebar&&<div className="overlay" onClick={()=>setSidebar(false)}/>}
  </div>;
}

function Heading({page,action}:{page:Page;action?:React.ReactNode}){
    return <div className="page-heading">
      <div><div className="eyebrow">FRAUD INTELLIGENCE</div><h1>{page}</h1><p>{descriptions[page]}</p></div>
      {action}
    </div>;
  }

function ApiError({page,message,onRetry}:{page:Page;message:string;onRetry:()=>void}){
    return <><Heading page={page}/><div className="notice error"><AlertTriangle size={20}/><div>
      <strong>Cannot reach the FraudFlow API</strong>
      <p>Start the backend from the project root: <code>.venv/bin/uvicorn backend.main:app --port 8000</code></p>
      <p className="error-detail">{message}</p>
      <button className="btn outline retry" onClick={onRetry}>Retry</button>
    </div></div></>;
  }

function Overview({summary,onViewAll}:{summary:Summary|null;onViewAll:()=>void}){
    const [top,setTop]=useState<Tx[]|null>(null);
    useEffect(()=>{api.transactions({sort:'risk',limit:5}).then(r=>setTop(r.items)).catch(()=>setTop([]))},[]);
    return <><Heading page="Overview"/>
      <div className="metrics">
        <Metric icon={<ArrowLeftRight/>} label="Total transactions" value={summary?count(summary.total_transactions):'…'} hint="Test period"/>
        <Metric icon={<ShieldAlert/>} label="Flagged by model" value={summary?count(summary.flagged):'…'} hint={summary?`Actual fraud: ${count(summary.actual_fraud)}`:'…'}/>
        <Metric icon={<Activity/>} label="Flagged rate" value={summary?pct(summary.flagged_rate,2):'…'} hint="Share of test transactions"/>
        <Metric icon={<Wallet/>} label="Total volume" value={summary?compactMoney(summary.total_volume):'…'} hint="Sum of transaction amounts"/>
      </div>
      <section className="panel">
        <div className="panel-top"><PanelTitle title="Highest-risk transactions" sub="Top fraud probabilities from the model"/><button className="link-btn" onClick={onViewAll}>View all →</button></div>
        <TransactionTable rows={top}/>
      </section>
    </>;
  }

function Transactions(){
    const [search,setSearch]=useState('');
    const [query,setQuery]=useState<TxQuery>({search:'',type:'',status:'',sort:'risk',limit:PAGE_SIZE,offset:0});
    const [rows,setRows]=useState<Tx[]|null>(null);
    const [total,setTotal]=useState(0);
    const update=(patch:Partial<TxQuery>)=>setQuery(q=>({...q,...patch,offset:'offset' in patch?patch.offset!:0}));

    useEffect(()=>{const t=setTimeout(()=>update({search}),300);return()=>clearTimeout(t)},[search]);
    useEffect(()=>{
      let active=true;
      setRows(null);
      api.transactions(query).then(r=>{if(active){setRows(r.items);setTotal(r.total)}}).catch(()=>active&&setRows([]));
      return()=>{active=false};
    },[query]);

    const from=total?query.offset+1:0;
    const to=Math.min(query.offset+PAGE_SIZE,total);
    return <><Heading page="Transactions" action={<a className="btn outline" href={api.exportUrl(query)} download><Download size={17}/> Export CSV</a>}/>
      <section className="panel">
        <div className="toolbar">
          <div className="search"><Search size={18}/><input aria-label="Search transactions" placeholder="Search ID, type, amount, step, status..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <div className="filter"><Filter size={17}/><select aria-label="Filter type" value={query.type} onChange={e=>update({type:e.target.value})}><option value="">All types</option>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
          <select aria-label="Filter status" className="filter-select" value={query.status} onChange={e=>update({status:e.target.value})}><option value="">All statuses</option><option>Flagged</option><option>Clear</option></select>
          <select aria-label="Sort" className="filter-select" value={query.sort} onChange={e=>update({sort:e.target.value as TxQuery['sort']})}><option value="risk">Highest risk first</option><option value="step">By step</option></select>
        </div>
        <div className="table-meta">Showing {count(from)}–{count(to)} of {count(total)} transactions</div>
        <TransactionTable rows={rows}/>
        <div className="pagination">
          <button className="btn outline" disabled={query.offset===0} onClick={()=>update({offset:Math.max(0,query.offset-PAGE_SIZE)})}><ChevronLeft size={16}/> Previous</button>
          <button className="btn outline" disabled={to>=total} onClick={()=>update({offset:query.offset+PAGE_SIZE})}>Next <ChevronRight size={16}/></button>
        </div>
      </section>
    </>;
  }

function Analytics({summary,metrics}:{summary:Summary|null;metrics:Metrics|null}){
    const cm=metrics?.test.confusion_matrix;
    const scores:[string,keyof Metrics['test']][]=[['Precision','precision'],['Recall','recall'],['F1 score','f1'],['Average precision','average_precision']];
    return <><Heading page="Analytics"/>
      <div className="notice"><BrainCircuit size={20}/><div><strong>Model connected</strong><p>Logistic regression on step, type and amount. Decision threshold {metrics?metrics.threshold.toFixed(4):'…'} was selected on the validation period by best F1; all numbers below are from the held-out test period.</p></div></div>
      <section className="panel">
        <PanelTitle title="Model performance" sub="Test period · validation value shown for comparison"/>
        <div className="placeholder-metrics">{scores.map(([name,key])=><div key={name}>
          <small>{name}</small><b>{metrics?pct(metrics.test[key] as number):'…'}</b>
          <span>Validation: {metrics?pct(metrics.validation[key as keyof Metrics['validation']]):'…'}</span>
        </div>)}</div>
      </section>
      <section className="panel">
        <PanelTitle title="Confusion matrix" sub="Test period predictions vs. actual labels"/>
        <div className="placeholder-metrics">
          {[['True positives','Fraud caught',cm?.[1][1]],['False negatives','Fraud missed',cm?.[1][0]],['False positives','Legit flagged',cm?.[0][1]],['True negatives','Legit cleared',cm?.[0][0]]].map(([name,hint,value])=>
            <div key={name as string}><small>{name}</small><b>{value!==undefined?count(value as number):'…'}</b><span>{hint}</span></div>)}
        </div>
      </section>
      <section className="panel">
        <PanelTitle title="Fraud by type" sub="Actual fraud vs. transactions flagged by the model"/>
        <div className="chart"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={summary?.by_type??[]}>
            <CartesianGrid vertical={false} stroke="#edf2ef"/>
            <XAxis dataKey="type" tick={{fontSize:10,fill:'#7b8e84'}} tickLine={false} axisLine={false}/>
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{fontSize:11,fill:'#91a09a'}}/>
            <Tooltip formatter={(v:number)=>count(v)}/>
            <Legend iconType="circle" iconSize={9} wrapperStyle={{fontSize:11}} formatter={(v:string)=><span style={{color:'#7e9286'}}>{v}</span>}/>
            <Bar dataKey="fraud" name="Actual fraud" fill="#d4eade" radius={[5,5,0,0]}/>
            <Bar dataKey="flagged" name="Flagged by model" fill="#159568" radius={[5,5,0,0]}/>
          </BarChart>
        </ResponsiveContainer></div>
      </section>
      <PredictPanel defaultStep={summary?.step_range[1]??743}/>
    </>;
  }

function PredictPanel({defaultStep}:{defaultStep:number}){
  const [form,setForm]=useState<{step:string;type:TxType;amount:string}>({step:String(defaultStep),type:'TRANSFER',amount:'250000'});
  const [result,setResult]=useState<Prediction|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const submit=(e:React.FormEvent)=>{
    e.preventDefault();
    setLoading(true);setError(null);
    api.predict({step:Number(form.step),type:form.type,amount:Number(form.amount)})
      .then(setResult).catch(e=>{setResult(null);setError(String(e.message??e))}).finally(()=>setLoading(false));
  };
  return <section className="panel">
    <PanelTitle title="Fraud detection" sub="Score a single transaction with the trained model"/>
    <form className="predict-form" onSubmit={submit}>
      <label>Step<input type="number" min={1} required value={form.step} onChange={e=>setForm({...form,step:e.target.value})}/></label>
      <label>Type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value as TxType})}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></label>
      <label>Amount<input type="number" min={0} step="0.01" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label>
      <button className="btn primary" type="submit" disabled={loading}><BrainCircuit size={17}/> {loading?'Checking…':'Check transaction'}</button>
    </form>
    {error&&<p className="form-error">{error}</p>}
    {result&&<div className={'predict-result '+(result.flagged?'review':'complete')}>
      {result.flagged?<ShieldAlert size={22}/>:<CheckCircle2 size={22}/>}
      <div><b>{result.flagged?'Flagged for review':'Looks legitimate'}</b>
        <span>Fraud probability {pct(result.probability,2)} · threshold {pct(result.threshold,2)}</span></div>
    </div>}
  </section>;
}

function Metric({icon,label,value,hint}:{icon:React.ReactNode,label:string,value:string,hint:string}){
  return <div className="metric"><div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div><strong>{value}</strong><small>{hint}</small></div>;
}

function PanelTitle({title,sub}:{title:string,sub:string}){
  return <div className="panel-title"><h2>{title}</h2><p>{sub}</p></div>;
}

function TransactionTable({rows}:{rows:Tx[]|null}){
  return <div className="table-wrap"><table>
    <thead><tr><th>TRANSACTION ID</th><th>TYPE</th><th>STEP</th><th>AMOUNT</th><th>FRAUD PROBABILITY</th><th>STATUS</th><th>ACTUAL</th></tr></thead>
    <tbody>{rows===null?<tr><td colSpan={7} className="no-results">Loading transactions…</td></tr>
      :rows.length?rows.map(t=><tr key={t.id}>
        <td className="id">{t.id}</td><td>{t.type}</td><td>{t.step}</td><td className="amount">{money(t.amount)}</td>
        <td><div className="risk"><div className="risk-bar"><div style={{width:`${Math.max(t.probability*100,1)}%`}}/></div>{pct(t.probability,2)}</div></td>
        <td><span className={'status '+(t.status==='Clear'?'complete':'review')}>{t.status==='Clear'?<CheckCircle2 size={13}/>:<Clock3 size={13}/>} {t.status}</span></td>
        <td className={t.is_fraud?'actual fraud':'actual'}>{t.is_fraud?'Fraud':'Legit'}</td>
      </tr>)
      :<tr><td colSpan={7} className="no-results">No matching transactions. Try a different search or filter.</td></tr>}</tbody>
  </table></div>;
}
