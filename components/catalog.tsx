'use client';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Product } from '@/lib/products';
import { supabase } from '@/lib/supabase';
import { Category } from '@/lib/admin';
import { loadMenu } from '@/lib/storefront';
import { ProductCard } from './product-card';
export function Catalog({featured=false}:{featured?:boolean}) {
 const [products,setProducts]=useState<Product[]>([]);const [categories,setCategories]=useState<Category[]>([]);const [category,setCategory]=useState('All favorites');const [query,setQuery]=useState('');const [error,setError]=useState('');const [loading,setLoading]=useState(true);
 useEffect(()=>{let disposed=false;loadMenu().then(data=>{if(!disposed){setProducts(data.products);setCategories(data.categories)}}).catch(e=>{if(!disposed)setError(e.message)}).finally(()=>{if(!disposed)setLoading(false)});return()=>{disposed=true}},[]);
 const filtered=products.filter(p=>(category==='All favorites'||p.category===category)&&p.name.toLowerCase().includes(query.toLowerCase()));
 return <><div className="catalog-tools"><div className="filters">{['All favorites',...categories.map(c=>c.name)].map(c=><button key={c} aria-pressed={c===category} className={c===category?'selected':''} onClick={()=>setCategory(c)}>{c}</button>)}</div>{!featured&&<label className="search"><Search size={16}/><input aria-label="Search kitchen products" placeholder="Find your favorite…" value={query} onChange={e=>setQuery(e.target.value)}/></label>}</div>{!supabase&&<p className="demo-note">Sample menu, stock, prices & illustrative imagery. Live orders require the kitchen’s Supabase connection.</p>}{error&&<p role="alert">{error}</p>}{loading&&<p className="empty">A little goodness is on its way…</p>}<div className="product-grid">{filtered.slice(0,featured?3:undefined).map(p=><ProductCard product={p} key={p.id}/>)}</div>{!loading&&!filtered.length&&!error&&<p className="empty">No favorites here yet. Try another category or contact our kitchen.</p>}</>}
