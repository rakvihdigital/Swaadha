'use client';
import { useEffect, useRef } from 'react';

export function HomeMotion({children}:{children:React.ReactNode}){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const element=root.current;if(!element)return;
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');let stop=()=>{};
  function setup(){stop();if(preference.matches||!('IntersectionObserver' in window)){element!.classList.remove('motion-ready');return}
   const seen=new WeakSet<Element>();const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('motion-visible');observer.unobserve(entry.target)}},{threshold:.04,rootMargin:'0px 0px -18px 0px'});
   const selectors=['.home-welcome-line','.family-home-section-heading','.family-celebration','.promise-editorial-heading','.kitchen-vows article','.family-story-art','.family-story-copy','.family-order-steps article','.family-table-cta','.product-card'];
   function watch(){element!.querySelectorAll<HTMLElement>(selectors.join(',')).forEach(node=>{if(seen.has(node))return;seen.add(node);node.classList.add('motion-item');const siblings=[...node.parentElement!.children];node.style.setProperty('--reveal-delay',`${Math.min(siblings.indexOf(node),3)*70}ms`);observer.observe(node)})}
   watch();element!.classList.add('motion-ready');const mutations=new MutationObserver(watch);mutations.observe(element!,{childList:true,subtree:true});
   function focus(event:FocusEvent){const target=event.target as HTMLElement;target.closest('.motion-item')?.classList.add('motion-visible')}
   element!.addEventListener('focusin',focus);stop=()=>{observer.disconnect();mutations.disconnect();element!.removeEventListener('focusin',focus);element!.classList.remove('motion-ready')};
  }
  setup();preference.addEventListener('change',setup);return()=>{stop();preference.removeEventListener('change',setup)};
 },[]);
 return <div ref={root} className="family-home">{children}</div>
}
