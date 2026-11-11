export const TYPES=['PAYMENT','TRANSFER','CASH_OUT','CASH_IN','DEBIT'] as const;
export type TxType=typeof TYPES[number];
export type Status='Flagged'|'Clear';

export type Tx={id:string;step:number;type:TxType;amount:number;probability:number;status:Status;is_fraud:boolean};
export type TxPage={total:number;items:Tx[]};
export type Summary={
  total_transactions:number;flagged:number;flagged_rate:number;actual_fraud:number;total_volume:number;
  step_range:[number,number];
  by_type:{type:TxType;count:number;flagged:number;fraud:number}[];
};
type Scores={precision:number;recall:number;f1:number;average_precision:number};
export type Metrics={threshold:number;validation:Scores;test:Scores&{confusion_matrix:[[number,number],[number,number]]}};
export type Prediction={probability:number;threshold:number;flagged:boolean};
export type TxQuery={search:string;type:string;status:string;sort:'risk'|'step';limit:number;offset:number};

async function request<T>(path:string,init?:RequestInit):Promise<T>{
  const res=await fetch(path,init);
  if(!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

function txParams(q:Partial<TxQuery>){
  const p=new URLSearchParams();
  Object.entries(q).forEach(([k,v])=>{if(v!==undefined&&v!=='')p.set(k,String(v))});
  return p.toString();
}

export const api={
  summary:()=>request<Summary>('/api/summary'),
  metrics:()=>request<Metrics>('/api/metrics'),
  transactions:(q:Partial<TxQuery>)=>request<TxPage>(`/api/transactions?${txParams(q)}`),
  exportUrl:(q:Partial<TxQuery>)=>`/api/transactions/export?${txParams({search:q.search,type:q.type,status:q.status})}`,
  predict:(body:{step:number;type:TxType;amount:number})=>request<Prediction>('/api/predict',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
  }),
};
