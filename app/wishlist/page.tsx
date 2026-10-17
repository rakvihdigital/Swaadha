'use client';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCommerce } from '@/components/commerce';
import { ProductCard } from '@/components/product-card';
import { loadMenu } from '@/lib/storefront';
import { Product } from '@/lib/products';
export default function Wishlist(){const {wishlist,ready,toggleWish}=useCommerce();const [menu,setMenu]=useState<Product[]|null>(null);useEffect(()=>{loadMenu().then(d=>setMenu(d.products)).catch(()=>setMenu(null))},[]);return <section className="section wishlist-page"><div className="eyebrow"><Heart size={13}/> SAVED WITH LOVE</div><h1>Your little list<br/>of <em>happy things.</em></h1><p>Your wishlist is saved in this browser. Add a favorite to your cart whenever the craving calls.</p>{ready&&!wishlist.length?<div className="empty"><Heart size={38}/><h2>A little empty, for now.</h2><Link className="button" href="/products">Explore the kitchen</Link></div>:<div className="product-grid">{wishlist.map(saved=>{const current=menu?.find(p=>p.id===saved.id);return menu&&!current?<article className="dashboard-card" key={saved.id}><h3>{saved.name}</h3><p>This product is no longer on the menu.</p><button className="text-link" onClick={()=>toggleWish(saved)}>Remove from wishlist</button></article>:<ProductCard key={saved.id} product={current??saved}/>} )}</div>}</section>}
