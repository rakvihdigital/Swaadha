'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { Product } from '@/lib/products';
export type CartItem={product:Product;quantity:number};
type Commerce={cart:CartItem[];wishlist:Product[];ready:boolean;notice:string;add:(p:Product,quantity?:number)=>void;quantity:(id:string,quantity:number)=>void;remove:(id:string)=>void;clear:()=>void;toggleWish:(p:Product)=>void};
const Context=createContext<Commerce|null>(null);
export function CommerceProvider({children}:{children:React.ReactNode}){
 const [cart,setCart]=useState<CartItem[]>([]);const [wishlist,setWishlist]=useState<Product[]>([]);const [ready,setReady]=useState(false);const [notice,setNotice]=useState('');
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('swaadha-bag-v1')||'null');if(Array.isArray(saved?.cart))setCart(saved.cart.filter((i:CartItem)=>i.product?.id&&Number.isInteger(i.quantity)&&i.quantity>0));if(Array.isArray(saved?.wishlist))setWishlist(saved.wishlist.filter((p:Product)=>p.id))}catch{}setReady(true)},[]);
 useEffect(()=>{if(ready)localStorage.setItem('swaadha-bag-v1',JSON.stringify({cart,wishlist}))},[cart,wishlist,ready]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),3500);return()=>clearTimeout(timer)},[notice]);
 function add(p:Product,amount=1){const existing=cart.find(i=>i.product.id===p.id)?.quantity??0;const max=Math.min(p.stock??0,100);if(!Number.isInteger(amount)||amount<1||existing+amount>max){setNotice(`Only ${max} packs of ${p.name} are available.`);return}setCart(list=>{const exists=list.find(i=>i.product.id===p.id);return exists?list.map(i=>i.product.id===p.id?{product:p,quantity:i.quantity+amount}:i):[...list,{product:p,quantity:amount}]});setNotice(`${p.name} added to your cart.`)}
 function quantity(id:string,n:number){if(!Number.isInteger(n)||n<1||n>100)return;setCart(list=>list.map(i=>i.product.id===id?{...i,quantity:n}:i))}
 function toggleWish(p:Product){const exists=wishlist.some(i=>i.id===p.id);setWishlist(list=>exists?list.filter(i=>i.id!==p.id):[...list,p]);setNotice(exists?'Removed from your wishlist.':`${p.name} saved to your wishlist.`)}
 return <Context.Provider value={{cart,wishlist,ready,notice,add,quantity,remove:id=>setCart(list=>list.filter(i=>i.product.id!==id)),clear:()=>setCart([]),toggleWish}}>{children}{notice&&<div className="commerce-toast" role="status">{notice}</div>}</Context.Provider>
}
export function useCommerce(){const value=useContext(Context);if(!value)throw new Error('Commerce provider is missing');return value}
